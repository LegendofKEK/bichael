import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LokWorld } from "./lok-world";

/** Keccak of KekDepositRequested(uint256,uint64,uint256,address). */
export const KEK_DEPOSIT_TOPIC = "0x44f9238c77e838571825580331e7e82218690fd4282906f9c351f6b85533ef47";

export type KekDeposit = { tokenId: string; nonce: string; amount: string };

const here = dirname(fileURLToPath(import.meta.url));

/** Fill empty env keys from a gitignored local file. Never overrides a value already set. */
export function loadLokEnv(env: NodeJS.ProcessEnv = process.env, paths?: string[]): void {
  const files = paths ?? [join(here, "../.env.local"), join(here, "../../../.env.local")];
  for (const path of files) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (env[key] == null || env[key] === "") env[key] = value;
    }
  }
}

export function decodeKekDeposit(log: { topics?: string[]; data?: string }): KekDeposit | null {
  const topics = log.topics ?? [];
  if (topics.length < 3 || topics[0]?.toLowerCase() !== KEK_DEPOSIT_TOPIC) return null;
  const data = log.data ?? "";
  if (!data.startsWith("0x") || data.length < 2 + 64) return null;
  try {
    return {
      tokenId: BigInt(topics[1]!).toString(),
      nonce: BigInt(topics[2]!).toString(),
      amount: BigInt(data.slice(0, 2 + 64)).toString(),
    };
  } catch {
    return null;
  }
}

/** Record a vault deposit the server already saw, then credit that character's log. Not a mint. */
export function applyKekDeposit(
  lok: Pick<LokWorld, "noteCustodyInbound" | "depositKek">,
  deposit: KekDeposit,
): { ok: true } | { ok: false; error: string } {
  lok.noteCustodyInbound({
    kind: "depositKek",
    tokenId: deposit.tokenId,
    nonce: deposit.nonce,
    amount: deposit.amount,
  });
  return lok.depositKek(deposit.tokenId, deposit.amount, deposit.nonce);
}

type RpcLog = { topics?: string[]; data?: string; blockNumber?: string; logIndex?: string };

export function startKekDepositWatcher(lok: Pick<LokWorld, "noteCustodyInbound" | "depositKek">): void {
  const rpc = process.env.LOK_CHAIN_RPC?.trim();
  const checkpoint = process.env.LOK_CHECKPOINT?.trim();
  if (!rpc || !checkpoint) return;
  const vault = process.env.LOK_VAULT?.trim() || "-";
  const kek = process.env.LOK_KEK?.trim() || "-";
  console.log(
    "[bellgrave] lok watcher rpc=" + rpc + " checkpoint=" + checkpoint + " vault=" + vault + " kek=" + kek,
  );
  const seen = new Set<string>();
  const warned = new Set<string>();
  let from = 0n;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const latest = BigInt(String(await jsonRpc(rpc, "eth_blockNumber", [])));
      if (latest < from) return;
      const logs = (await jsonRpc(rpc, "eth_getLogs", [
        {
          address: checkpoint,
          fromBlock: "0x" + from.toString(16),
          toBlock: "0x" + latest.toString(16),
          topics: [KEK_DEPOSIT_TOPIC],
        },
      ])) as RpcLog[];
      if (!Array.isArray(logs)) throw new Error("eth_getLogs returned no list");
      let stuck = false;
      const deposits = logs
        .slice()
        .sort((a, b) => cmpHex(a.blockNumber, b.blockNumber) || cmpHex(a.logIndex, b.logIndex))
        .map(decodeKekDeposit)
        .filter((row): row is KekDeposit => row != null);
      for (const deposit of deposits) {
        const key = deposit.tokenId + ":" + deposit.nonce;
        if (seen.has(key)) continue;
        const res = applyKekDeposit(lok, deposit);
        if (res.ok) {
          seen.add(key);
          console.log(
            "[bellgrave] credited KEK deposit token=" +
              deposit.tokenId +
              " nonce=" +
              deposit.nonce +
              " amount=" +
              deposit.amount,
          );
        } else {
          stuck = true;
          if (!warned.has(key)) {
            warned.add(key);
            console.error("[bellgrave] KEK deposit not credited " + key + ": " + res.error);
          }
        }
      }
      if (!stuck) from = latest + 1n;
    } finally {
      busy = false;
    }
  };
  tick().catch((err) => console.error("[bellgrave] lok watcher", err));
  const timer = setInterval(() => {
    tick().catch((err) => console.error("[bellgrave] lok watcher", err));
  }, 4000);
  timer.unref?.();
}

function cmpHex(a: string | undefined, b: string | undefined): number {
  const left = BigInt(a && a !== "0x" ? a : "0x0");
  const right = BigInt(b && b !== "0x" ? b : "0x0");
  return left < right ? -1 : left > right ? 1 : 0;
}

async function jsonRpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "rpc error");
  return body.result;
}

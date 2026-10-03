import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LokListingView, LokSnapshot } from "@bellgrave/protocol";
import { defaultWasmPath, loadLokExports, lokCall, lokOut, type LokExports } from "./lok-engine";

export type LokResult = { ok: true } | { ok: false; error: string };

type EngineItem = { itemId: string; amount: string };
type EngineCharacter = { tokenId: string; kek: string; items: EngineItem[] };
type EngineListing = {
  id: string;
  seller: string;
  itemId: string;
  amount: string;
  highBidder: string | null;
  highBid: string;
};
type EngineState = { characters: EngineCharacter[]; listings: EngineListing[] };
type ApplyBody = {
  ok?: boolean;
  error?: string;
  entry?: unknown;
  len?: number;
  state?: EngineState;
};

type BindChar = { charId: string; tokenId: string; name: string; job: number };
type BindFile = { nextToken: string; nextListing: string; chars: BindChar[] };

const here = dirname(fileURLToPath(import.meta.url));

export function defaultLokDir(): string {
  return process.env.LOK_DATA_DIR?.trim() || join(here, "../data");
}

export function chainModeFromEnv(env: NodeJS.ProcessEnv = process.env): {
  chain: LokSnapshot["chain"];
  note: string;
} {
  const rpc = env.LOK_CHAIN_RPC?.trim();
  if (!rpc) {
    return {
      chain: "engine-only",
      note: "No LOK_CHAIN_RPC. KEK deposits and item exports stay engine events; Robinhood L2 is not queried and nothing is submitted.",
    };
  }
  return {
    chain: "rpc-unwatched",
    note: "LOK_CHAIN_RPC is set, but no KekVault watcher or export transaction is wired. Deposits and exports still only append the hash-chained log.",
  };
}

function atomicWrite(path: string, text: string) {
  const tmp = path + ".tmp";
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function asItemId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * One hash-chained world log. The wasm engine accepts or rejects every move.
 * Deposit credits KEK the caller already holds in custody. It does not mint.
 */
export class LokWorld {
  readonly logPath: string;
  readonly chain: LokSnapshot["chain"];
  readonly chainNote: string;
  private readonly exp: LokExports;
  private readonly bindPath: string;
  private bind: BindFile;
  private state: EngineState = { characters: [], listings: [] };
  length = 0;

  private constructor(dataDir: string, wasmPath: string, env: NodeJS.ProcessEnv) {
    mkdirSync(dataDir, { recursive: true });
    this.logPath = join(dataDir, "lok-world.json");
    this.bindPath = join(dataDir, "lok-bind.json");
    const mode = chainModeFromEnv(env);
    this.chain = mode.chain;
    this.chainNote = mode.note;
    this.exp = loadLokExports(wasmPath);
    const text = existsSync(this.logPath) ? readFileSync(this.logPath, "utf8") : "";
    const opened = lokCall(this.exp, text, (ptr, len) => this.exp.lok_open(ptr, len));
    if (opened.rc !== 0) {
      throw new Error("lok log refused to open: " + opened.out);
    }
    this.bind = this.readBind();
    this.refresh();
    this.reconcileBind();
    if (!existsSync(this.logPath)) this.persistLog();
    this.saveBind();
  }

  static open(dataDir = defaultLokDir(), wasmPath = defaultWasmPath(), env: NodeJS.ProcessEnv = process.env): LokWorld {
    return new LokWorld(dataDir, wasmPath, env);
  }

  tokenFor(charId: string): string | null {
    return this.bind.chars.find((c) => c.charId === charId)?.tokenId ?? null;
  }

  spawn(charId: string, name: string, job: number): { ok: true; tokenId: string } | { ok: false; error: string } {
    const existing = this.tokenFor(charId);
    if (existing) return { ok: true, tokenId: existing };
    const tokenId = this.bind.nextToken;
    const res = this.apply({ op: "spawn", tokenId, startingJob: job });
    if (!res.ok) return res;
    this.bind.chars.push({ charId, tokenId, name, job });
    this.bind.nextToken = (BigInt(tokenId) + 1n).toString();
    this.saveBind();
    return { ok: true, tokenId };
  }

  /** Log image of a vault deposit. Caller must already have custody. Never a mint. */
  depositKek(tokenId: string, amount: string): LokResult {
    return this.apply({ op: "depositKek", tokenId, amount });
  }

  importItem(tokenId: string, itemId: string, amount: string): LokResult {
    return this.apply({ op: "importItem", tokenId, itemId, amount });
  }

  exportItem(tokenId: string, itemId: string, amount: string): LokResult {
    return this.apply({ op: "exportItem", tokenId, itemId, amount });
  }

  sendItem(from: string, to: string, itemId: string, amount: string): LokResult {
    return this.apply({ op: "sendItem", from, to, itemId, amount });
  }

  sendKek(from: string, to: string, amount: string): LokResult {
    return this.apply({ op: "sendKek", from, to, amount });
  }

  list(seller: string, itemId: string, amount: string): LokResult & { listingId?: string } {
    const listingId = this.bind.nextListing;
    const res = this.apply({ op: "list", listingId, seller, itemId, amount });
    if (!res.ok) return res;
    this.bind.nextListing = (BigInt(listingId) + 1n).toString();
    this.saveBind();
    return { ok: true, listingId };
  }

  bid(listingId: string, bidder: string, amount: string): LokResult {
    return this.apply({ op: "bid", listingId, bidder, amount });
  }

  cancel(listingId: string, seller: string): LokResult {
    return this.apply({ op: "cancel", listingId, seller });
  }

  settle(listingId: string): LokResult {
    return this.apply({ op: "settle", listingId });
  }

  resolveName(name: string, selfToken: string): { ok: true; tokenId: string } | { ok: false; error: string } {
    const key = name.trim().toLowerCase();
    if (!key) return { ok: false, error: "Name a character." };
    const hits = this.bind.chars.filter((c) => c.name.toLowerCase() === key);
    if (hits.length === 0) return { ok: false, error: "No character by that name is on the log." };
    if (hits.length > 1) return { ok: false, error: "That name is not unique on the log." };
    if (hits[0]!.tokenId === selfToken) return { ok: false, error: "You cannot send to yourself." };
    return { ok: true, tokenId: hits[0]!.tokenId };
  }

  view(tokenId: string): LokSnapshot {
    const me = this.state.characters.find((c) => c.tokenId === tokenId);
    const nameOf = (id: string | null) => {
      if (!id) return null;
      return this.bind.chars.find((c) => c.tokenId === id)?.name ?? id;
    };
    const items = (me?.items ?? [])
      .map((row) => {
        const id = asItemId(row.itemId);
        if (id == null || id <= 0) return null;
        return { tokenId: id, amount: row.amount };
      })
      .filter((row): row is { tokenId: number; amount: string } => row != null);
    const listings: LokListingView[] = [];
    for (const row of this.state.listings) {
      const itemId = asItemId(row.itemId);
      if (itemId == null) continue;
      listings.push({
        id: row.id,
        seller: row.seller,
        sellerName: nameOf(row.seller) ?? row.seller,
        itemId,
        amount: row.amount,
        highBidder: row.highBidder,
        highBidderName: nameOf(row.highBidder),
        highBid: row.highBid,
        yours: row.seller === tokenId,
      });
    }
    return {
      tokenId,
      kek: me?.kek ?? "0",
      items,
      listings,
      chain: this.chain,
    };
  }

  kekOf(tokenId: string): string {
    return this.state.characters.find((c) => c.tokenId === tokenId)?.kek ?? "0";
  }

  itemOf(tokenId: string, itemId: string): string {
    const me = this.state.characters.find((c) => c.tokenId === tokenId);
    return me?.items.find((row) => row.itemId === itemId)?.amount ?? "0";
  }

  private apply(cmd: Record<string, unknown>): LokResult {
    const called = lokCall(this.exp, JSON.stringify(cmd), (ptr, len) => this.exp.lok_apply(ptr, len));
    let body: ApplyBody;
    try {
      body = JSON.parse(called.out) as ApplyBody;
    } catch {
      return { ok: false, error: "lok engine returned junk" };
    }
    if (!body.ok) return { ok: false, error: body.error || "rejected" };
    if (body.state) this.state = body.state;
    if (typeof body.len === "number") this.length = body.len;
    if (body.entry) this.persistLog();
    return { ok: true };
  }

  private refresh() {
    const called = lokCall(this.exp, JSON.stringify({ op: "state" }), (ptr, len) => this.exp.lok_apply(ptr, len));
    const body = JSON.parse(called.out) as ApplyBody;
    if (!body.ok || !body.state) throw new Error("lok state failed");
    this.state = body.state;
    this.length = body.len ?? 0;
  }

  private persistLog() {
    this.exp.lok_document();
    atomicWrite(this.logPath, lokOut(this.exp));
  }

  private readBind(): BindFile {
    if (!existsSync(this.bindPath)) {
      return { nextToken: "1", nextListing: "1", chars: [] };
    }
    const parsed = JSON.parse(readFileSync(this.bindPath, "utf8")) as BindFile;
    return {
      nextToken: parsed.nextToken || "1",
      nextListing: parsed.nextListing || "1",
      chars: Array.isArray(parsed.chars) ? parsed.chars : [],
    };
  }

  private reconcileBind() {
    const live = new Set(this.state.characters.map((c) => c.tokenId));
    this.bind.chars = this.bind.chars.filter((c) => live.has(c.tokenId));
    for (const c of this.state.characters) {
      if (!this.bind.chars.some((row) => row.tokenId === c.tokenId)) {
        this.bind.chars.push({
          charId: "replayed:" + c.tokenId,
          tokenId: c.tokenId,
          name: c.tokenId,
          job: 0,
        });
      }
    }
    const maxToken = this.state.characters.reduce((max, c) => {
      try {
        const n = BigInt(c.tokenId);
        return n > max ? n : max;
      } catch {
        return max;
      }
    }, 0n);
    const maxList = this.state.listings.reduce((max, row) => {
      try {
        const n = BigInt(row.id);
        return n > max ? n : max;
      } catch {
        return max;
      }
    }, 0n);
    const nextToken = BigInt(this.bind.nextToken);
    const nextListing = BigInt(this.bind.nextListing);
    if (nextToken <= maxToken) this.bind.nextToken = (maxToken + 1n).toString();
    if (nextListing <= maxList) this.bind.nextListing = (maxList + 1n).toString();
  }

  private saveBind() {
    atomicWrite(this.bindPath, JSON.stringify(this.bind, null, 2));
  }
}
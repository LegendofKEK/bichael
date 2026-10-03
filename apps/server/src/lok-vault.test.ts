import assert from "node:assert/strict";
import test from "node:test";
import { debitAfterQueue, depositCastArgs, queueKekWithdrawal, type CastFn } from "./lok-vault";

const ENV = {
  LOK_CHAIN_RPC: "http://127.0.0.1:8545",
  LOK_CHECKPOINT: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  LOK_VAULT: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  LOK_KEK: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  LOK_NFT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  LOK_FACTORY: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  LOK_RULESETS: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  LOK_OWNER_KEY: "owner-key",
  LOK_ROTATOR_KEY: "rotator-key",
};

test("a failed vault queue does not debit spendable KEK", async () => {
  let debited = false;
  const res = await debitAfterQueue(
    async () => ({ ok: false, error: "reverted" }),
    () => {
      debited = true;
      return { ok: true };
    },
  );
  assert.equal(res.ok, false);
  assert.equal(res.debited, false);
  assert.equal(debited, false);
});

test("spendable KEK is debited only after the queue exists", async () => {
  let debited = false;
  const res = await debitAfterQueue(
    async () => ({ ok: true, id: "4", availableAt: 10 }),
    () => {
      debited = true;
      return { ok: true };
    },
  );
  assert.equal(res.ok, true);
  assert.equal(debited, true);
  if (res.ok) assert.equal(res.id, "4");
});

test("deposit submissions approve and deposit and never mint", () => {
  const plan = depositCastArgs(
    {
      rpc: ENV.LOK_CHAIN_RPC,
      checkpoint: ENV.LOK_CHECKPOINT,
      vault: ENV.LOK_VAULT,
      kek: ENV.LOK_KEK,
      nft: "",
      factory: "",
      rulesets: "",
      ownerKey: "owner-key",
      rotatorKey: "",
      proposerKey: "",
      castBin: "cast",
    },
    "6",
    "25",
  );
  assert.match(plan[0]!.join(" "), /approve\(address,uint256\)/);
  assert.match(plan[1]!.join(" "), /depositKek\(uint256,uint256\)/);
  assert.equal(plan.flat().join(" ").includes("mint"), false);
});

test("a reverted checkpoint does not report a queued withdrawal", async () => {
  const cast: CastFn = async (args) => {
    const cmd = args[0] ?? "";
    const sig = args[2] ?? "";
    if (cmd === "wallet" && args[1] === "address") {
      return { stdout: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\n", stderr: "" };
    }
    if (cmd === "block") return { stdout: "1000\n", stderr: "" };
    if (cmd === "chain-id") return { stdout: "31337\n", stderr: "" };
    if (cmd === "keccak" || cmd === "abi-encode") return { stdout: "0x" + "11".repeat(32) + "\n", stderr: "" };
    if (cmd === "wallet" && args[1] === "sign") return { stdout: "0x" + "ab".repeat(65) + "\n", stderr: "" };
    if (cmd === "call") {
      if (sig.startsWith("ownerOf")) return { stdout: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\n", stderr: "" };
      if (sig.startsWith("isAccepted")) return { stdout: "true\n", stderr: "" };
      if (sig.startsWith("isActiveSigner")) return { stdout: "true\n", stderr: "" };
      if (sig.startsWith("stateRoot")) return { stdout: "0x" + "33".repeat(32) + "\n", stderr: "" };
      if (sig.startsWith("logIndex") || sig.startsWith("version") || sig.startsWith("nextWithdrawalId")) {
        return { stdout: "0\n", stderr: "" };
      }
      if (sig.startsWith("inboundApplied") || sig.startsWith("summary")) return { stdout: "1\n", stderr: "" };
    }
    if (cmd === "send" && sig.startsWith("checkpoint")) throw new Error("revert");
    throw new Error("unexpected " + cmd + " " + sig);
  };
  const res = await queueKekWithdrawal("6", "1", ENV, cast);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /No in-game KEK was spent/);
});

test("missing vault config refuses without debiting", async () => {
  let called = false;
  const res = await queueKekWithdrawal("6", "1", {}, async () => {
    called = true;
    return { stdout: "", stderr: "" };
  });
  assert.equal(res.ok, false);
  assert.equal(called, false);
});

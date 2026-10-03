import assert from "node:assert/strict";
import test from "node:test";
import { endClaim, guardedKekMove, guardedWithdraw, prepareClaim, reservedOf } from "./kek-guard";

test("a withdrawal in flight cannot fund both the vault queue and a transfer", async () => {
  let alice = 1000n;
  let bob = 0n;
  let queued = false;
  let release: (value: { ok: true; id: string; availableAt: number }) => void = () => {};
  const gate = new Promise<{ ok: true; id: string; availableAt: number }>((resolve) => {
    release = resolve;
  });
  let entered = () => {};
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });

  const withdraw = guardedWithdraw({
    token: "alice",
    amount: "1000",
    balanceOf: () => alice.toString(),
    debit: () => {
      if (alice < 1000n) return { ok: false, error: "short" };
      alice -= 1000n;
      return { ok: true };
    },
    queue: () => {
      entered();
      return gate.then((row) => {
        queued = true;
        return row;
      });
    },
  });

  await started;
  const send = guardedKekMove("alice", () => {
    const free = alice - reservedOf("alice");
    if (free < 1000n) return { ok: false as const, error: "short" };
    alice -= 1000n;
    bob += 1000n;
    return { ok: true as const };
  });

  release({ ok: true, id: "9", availableAt: 1 });
  const [withdrawn, sent] = await Promise.all([withdraw, send]);
  assert.equal(withdrawn.ok, true);
  assert.equal(sent.ok, false);
  assert.equal(queued, true);
  assert.equal(bob, 0n);
  assert.equal(alice, 0n);
  assert.equal(reservedOf("alice"), 0n);
  assert.equal(bob + alice + (queued ? 1000n : 0n) <= 1000n, true);
});

test("a failed queue returns the reserve so the deposit can still be sent", async () => {
  let alice = 1000n;
  let bob = 0n;
  const withdrawn = await guardedWithdraw({
    token: "alice-fail",
    amount: "1000",
    balanceOf: () => alice.toString(),
    debit: () => {
      alice -= 1000n;
      return { ok: true };
    },
    queue: async () => ({ ok: false, error: "reverted" }),
  });
  assert.equal(withdrawn.ok, false);
  assert.equal(alice, 1000n);
  assert.equal(reservedOf("alice-fail"), 0n);
  const sent = await guardedKekMove("alice-fail", () => {
    const free = alice - reservedOf("alice-fail");
    if (free < 1000n) return { ok: false as const };
    alice -= 1000n;
    bob += 1000n;
    return { ok: true as const };
  });
  assert.equal(sent.ok, true);
  assert.equal(bob, 1000n);
  assert.equal(alice, 0n);
});

test("a claim for another token's withdrawal is rejected before a cast", () => {
  let cast = false;
  const foreign = prepareClaim("bob", { tokenId: "alice" }, 1_000);
  if (foreign.ok) cast = true;
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.match(foreign.error, /another character/);
  assert.equal(cast, false);

  const own = prepareClaim("alice", { tokenId: "alice" }, 1_000);
  assert.equal(own.ok, true);
  const overlap = prepareClaim("alice", { tokenId: "alice" }, 1_500);
  assert.equal(overlap.ok, false);
  if (!overlap.ok) assert.match(overlap.error, /already in progress/);
  endClaim("alice");
  const soon = prepareClaim("alice", { tokenId: "alice" }, 2_000);
  assert.equal(soon.ok, false);
  if (!soon.ok) assert.match(soon.error, /Wait/);
});

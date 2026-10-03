import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LokWorld } from "./lok-world";

function noteImport(lok: LokWorld, tokenId: string, itemId: string, amount: string, nonce: string) {
  lok.noteCustodyInbound({ kind: "importItem", tokenId, nonce, itemId, amount });
  return lok.importItem(tokenId, itemId, amount, nonce);
}

function noteDeposit(lok: LokWorld, tokenId: string, amount: string, nonce: string) {
  lok.noteCustodyInbound({ kind: "depositKek", tokenId, nonce, amount });
  return lok.depositKek(tokenId, amount, nonce);
}


function world() {
  const dir = mkdtempSync(join(tmpdir(), "lok-world-"));
  return LokWorld.open(dir, undefined, {});
}

test("item transfer is logged and a short or self send is rejected", () => {
  const lok = world();
  const a = lok.spawn("char-a", "Ada", 0);
  const b = lok.spawn("char-b", "Bea", 1);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(noteImport(lok, a.tokenId, "7", "3", "1").ok, true);
  assert.equal(lok.sendItem(a.tokenId, b.tokenId, "7", "2").ok, true);
  assert.equal(lok.itemOf(a.tokenId, "7"), "1");
  assert.equal(lok.itemOf(b.tokenId, "7"), "2");
  const len = lok.length;
  const self = lok.sendItem(a.tokenId, a.tokenId, "7", "1");
  assert.equal(self.ok, false);
  if (!self.ok) assert.match(self.error, /self/i);
  const short = lok.sendItem(a.tokenId, b.tokenId, "7", "5");
  assert.equal(short.ok, false);
  if (!short.ok) assert.match(short.error, /insufficient/i);
  assert.equal(lok.length, len);
  assert.equal(lok.itemOf(a.tokenId, "7"), "1");
  assert.equal(lok.itemOf(b.tokenId, "7"), "2");
});

test("auction settle pays the high bid with no fee and replays after restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "lok-auction-"));
  const lok = LokWorld.open(dir, undefined, {});
  const a = lok.spawn("char-a", "Ada", 0);
  const b = lok.spawn("char-b", "Bea", 1);
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(noteImport(lok, a.tokenId, "7", "1", "1").ok, true);
  // Custody credit, not a faucet: the test stands in for a vault deposit the server was told already happened.
  assert.equal(noteDeposit(lok, b.tokenId, "9", "1").ok, true);
  const listed = lok.list(a.tokenId, "7", "1");
  assert.equal(listed.ok, true);
  if (!listed.ok || !listed.listingId) return;
  assert.equal(lok.itemOf(a.tokenId, "7"), "0");
  assert.equal(lok.bid(listed.listingId, b.tokenId, "3").ok, true);
  const low = lok.bid(listed.listingId, b.tokenId, "2");
  assert.equal(low.ok, false);
  assert.equal(lok.bid(listed.listingId, b.tokenId, "5").ok, true);
  assert.equal(lok.kekOf(b.tokenId), "4");
  const cancel = lok.cancel(listed.listingId, b.tokenId);
  assert.equal(cancel.ok, false);
  if (!cancel.ok) assert.match(cancel.error, /seller/i);
  assert.equal(lok.settle(listed.listingId).ok, true);
  assert.equal(lok.itemOf(b.tokenId, "7"), "1");
  assert.equal(lok.kekOf(a.tokenId), "5");
  assert.equal(lok.kekOf(b.tokenId), "4");
  assert.equal(lok.view(a.tokenId).listings.length, 0);

  const again = LokWorld.open(dir, undefined, {});
  assert.equal(again.itemOf(b.tokenId, "7"), "1");
  assert.equal(again.kekOf(a.tokenId), "5");
  assert.equal(again.kekOf(b.tokenId), "4");
  assert.equal(again.length, lok.length);
});

test("withdrawKek drops spendable balance and a transfer is stored on both logs", () => {
  const dir = mkdtempSync(join(tmpdir(), "lok-withdraw-"));
  const lok = LokWorld.open(dir, undefined, {});
  const a = lok.spawn("char-a", "Ada", 0);
  const b = lok.spawn("char-b", "Bea", 1);
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(noteDeposit(lok, a.tokenId, "10", "1").ok, true);
  assert.equal(lok.withdrawKek(a.tokenId, "4").ok, true);
  assert.equal(lok.kekOf(a.tokenId), "6");
  const len = lok.length;
  const over = lok.withdrawKek(a.tokenId, "7");
  assert.equal(over.ok, false);
  if (!over.ok) assert.match(over.error, /insufficient/i);
  assert.equal(lok.length, len);
  assert.equal(lok.kekOf(a.tokenId), "6");
  assert.equal(lok.sendKek(a.tokenId, b.tokenId, "2").ok, true);
  assert.equal(lok.kekOf(a.tokenId), "4");
  assert.equal(lok.kekOf(b.tokenId), "2");

  const doc = JSON.parse(readFileSync(lok.logPath, "utf8")) as {
    type: string;
    characters: { tokenId: string; entries: { hash: string; input: { type: string } }[] }[];
  };
  assert.equal(doc.type, "characters");
  const logA = doc.characters.find((c) => c.tokenId === a.tokenId);
  const logB = doc.characters.find((c) => c.tokenId === b.tokenId);
  const sendA = logA?.entries.find((e) => e.input.type === "sendKek");
  const sendB = logB?.entries.find((e) => e.input.type === "sendKek");
  assert.ok(sendA && sendB);
  assert.notEqual(sendA.hash, sendB.hash);
  assert.deepEqual(sendA.input, sendB.input);

  const again = LokWorld.open(dir, undefined, {});
  assert.equal(again.kekOf(a.tokenId), "4");
  assert.equal(again.kekOf(b.tokenId), "2");
  assert.equal(again.length, lok.length);
});

test("deposit nonce replay fails and two recorded nonces credit twice", () => {
  const lok = world();
  const a = lok.spawn("char-a", "Ada", 0);
  assert.equal(a.ok, true);
  if (!a.ok) return;
  assert.equal(lok.depositKek(a.tokenId, "4", "1").ok, false);
  assert.equal(noteDeposit(lok, a.tokenId, "4", "1").ok, true);
  assert.equal(lok.kekOf(a.tokenId), "4");
  assert.equal(noteDeposit(lok, a.tokenId, "4", "1").ok, false);
  assert.equal(lok.kekOf(a.tokenId), "4");
  assert.equal(noteDeposit(lok, a.tokenId, "6", "2").ok, true);
  assert.equal(lok.kekOf(a.tokenId), "10");
  assert.equal(noteImport(lok, a.tokenId, "7", "2", "3").ok, true);
  assert.equal(lok.itemOf(a.tokenId, "7"), "2");
  assert.equal(noteImport(lok, a.tokenId, "7", "1", "3").ok, false);
  assert.equal(lok.itemOf(a.tokenId, "7"), "2");
});


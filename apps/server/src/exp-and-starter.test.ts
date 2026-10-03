import assert from "node:assert/strict";
import test from "node:test";
import { xpToNextLevel } from "@bellgrave/combat";
import { getItem } from "@bellgrave/items";
import {
  STARTER_POTION_AMOUNT,
  STARTER_POTION_ID,
  STARTER_WEAPON,
  addStack,
  discardStack,
  signatureWeaponEquipped,
  takeStack,
} from "./starter-kit";

const BANDS: { from: number; to: number; low: number; high: number; total: number }[] = [
  { from: 1, to: 10, low: 500, high: 2400, total: 13350 },
  { from: 11, to: 20, low: 2600, high: 4400, total: 48350 },
  { from: 21, to: 30, low: 4600, high: 5700, total: 100550 },
  { from: 31, to: 40, low: 5800, high: 6700, total: 163050 },
  { from: 41, to: 50, low: 6800, high: 7700, total: 235550 },
  { from: 51, to: 60, low: 7800, high: 17600, total: 358550 },
  { from: 61, to: 70, low: 18800, high: 32000, total: 611350 },
  { from: 71, to: 75, low: 34000, high: 44000, total: 845350 },
];

test("xp curve hits band endpoints and cumulative totals", () => {
  let sum = 0;
  for (const band of BANDS) {
    assert.equal(xpToNextLevel(band.from), band.low);
    assert.equal(xpToNextLevel(band.to), band.high);
    for (let level = band.from; level <= band.to; level++) sum += xpToNextLevel(level);
    assert.equal(sum, band.total);
  }
  assert.equal(xpToNextLevel(75), 44000);
  assert.equal(xpToNextLevel(76), 44000);
});

test("starter weapons are the lowest catalog piece of each family", () => {
  const expect = {
    time_mage: { id: 1, family: "staff" },
    sorcerer: { id: 1, family: "staff" },
    fighter: { id: 8, family: "greatsword" },
    rogue: { id: 317, family: "dagger" },
    cleric: { id: 183, family: "club" },
    battle_mage: { id: 102, family: "sword" },
    knight: { id: 102, family: "sword" },
  };
  for (const [job, row] of Object.entries(expect)) {
    const grant = STARTER_WEAPON[job as keyof typeof STARTER_WEAPON];
    const def = getItem(grant.tokenId);
    assert.equal(grant.tokenId, row.id);
    assert.equal(def?.weaponFamily, row.family);
    assert.equal(def?.slot, "main");
  }
  assert.equal(STARTER_POTION_ID, 3);
  assert.equal(STARTER_POTION_AMOUNT, 3);
  assert.equal(getItem(3)?.kind, "consumable");
});

test("starter stacks stay distinct from a later drop and cannot be laundered", () => {
  const inv: { tokenId: number; amount: number; starter?: boolean }[] = [];
  addStack(inv, 102, 1, true);
  addStack(inv, 102, 1, false);
  assert.equal(inv.length, 2);
  assert.equal(takeStack(inv, 102, 1), true);
  assert.deepEqual(inv, [{ tokenId: 102, amount: 1, starter: true }]);
  assert.equal(discardStack(inv, 102, false), 0);
  assert.equal(discardStack(inv, 102, true), 1);
  assert.equal(inv.length, 0);
});

test("signature weapons accept the starter id and the legacy kit id", () => {
  const bronze = {
    equip: { main: 102 },
    inventory: [{ tokenId: 102, amount: 1, starter: true }],
  };
  assert.equal(signatureWeaponEquipped(bronze, [4, 102]), true);
  const iron = {
    equip: { main: 4 },
    inventory: [{ tokenId: 4, amount: 1 }],
  };
  assert.equal(signatureWeaponEquipped(iron, [4, 102]), true);
  assert.equal(signatureWeaponEquipped(bronze, [1]), false);
});

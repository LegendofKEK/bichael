/** Shared combat helpers + Time Mage full kit */

import type { JobId } from "./jobs";

export type Stats = {
  str: number;
  dex: number;
  vit: number;
  agi: number;
  int: number;
  mnd: number;
};

export const GUARD_L1: Stats = {
  str: 10,
  dex: 8,
  vit: 12,
  agi: 6,
  int: 4,
  mnd: 4,
};

export function defenseFromVit(vit: number): number {
  return Math.floor(vit * 1.5);
}

export function evasionFromAgi(agi: number): number {
  return Math.floor(agi / 2);
}

/** Physical-swing crit from Agility: +0.1% per point (10 AGI = +1%), on top of base crit. */
export function critFromAgi(agi: number): number {
  return Math.max(0, agi) * 0.001;
}

export type Stance = "flux" | "aether" | "none";

export function attackFromStats(
  stats: Stats,
  stance: Stance | boolean,
  weaponBonus = 8,
  opts?: { physical?: boolean },
): number {
  // Weapon jobs and staff chip (Sorcerer / Cleric): full STR + weapon.
  // Time Mage passes physical: false and uses Flux / the 10% lock below.
  if (opts?.physical) {
    return Math.max(1, Math.floor(stats.str + weaponBonus));
  }
  // Legacy boolean: true = flux
  const s: Stance = typeof stance === "boolean" ? (stance ? "flux" : "none") : stance;
  if (s === "flux") {
    return Math.max(1, Math.floor(stats.mnd + weaponBonus));
  }
  // Aether + unstanced TIM: melee suppressed
  return Math.max(1, Math.floor((stats.str + weaponBonus) * 0.1));
}

export function hitChance(acc: number, eva: number): number {
  return Math.min(0.95, Math.max(0.2, 0.75 + (acc - eva) / 200));
}

export function physicalDamage(
  att: number,
  def: number,
  fStr: number,
  crit: boolean,
): number {
  const ratio = Math.max(0.1, Math.min(2.5, att / Math.max(1, def)));
  let dmg = Math.floor((8 + fStr) * ratio);
  if (crit) dmg = Math.floor(dmg * 1.25);
  return Math.max(1, dmg);
}

export function swingDelayMs(baseDelay: number, hastePct: number): number {
  const haste = Math.min(0.8, Math.max(0, hastePct));
  return Math.floor(baseDelay * (1 - haste));
}

export function fStr(attackerStr: number, targetVit: number): number {
  return Math.max(-10, Math.min(20, attackerStr - targetVit));
}

/** Time Mage is the only job whose autos use the Flux / 10% stance formula. */
export function meleeUsesWeaponAttack(job: JobId): boolean {
  return job !== "time_mage";
}

/**
 * Auto-attack fSTR.
 * Flux Time Mage uses MND. Rogue daggers add a quarter of DEX so a level-1
 * hit lands just under Knight and well under Fighter. Sorcerer and Cleric
 * swing with STR, but a deep STR deficit is floored at -1 — otherwise
 * (8 + fSTR) collapses and the staff hits for 1.
 */
export function meleeFStr(
  job: JobId,
  stats: Pick<Stats, "str" | "dex" | "mnd">,
  targetVit: number,
  stance: Stance | boolean,
): number {
  const s: Stance = typeof stance === "boolean" ? (stance ? "flux" : "none") : stance;
  if (job === "time_mage" && s === "flux") return fStr(stats.mnd, targetVit);
  if (job === "rogue") return fStr(stats.str + Math.floor(stats.dex * 0.25), targetVit);
  if (job === "sorcerer" || job === "cleric") return Math.max(-1, fStr(stats.str, targetVit));
  return fStr(stats.str, targetVit);
}

/** @deprecated Use TIM_ABILITIES — kept for older imports. */
export const ABILITIES = {
  flux: { mp: 0, recastMs: 30_000 },
  quicken: { mp: 12, recastMs: 15_000, durationMs: 90_000, haste: 0.35 },
  slow: { mp: 15, recastMs: 20_000, durationMs: 30_000, hastePenalty: 0.25 },
  cure: { mp: 8, recastMs: 6_000, heal: 45 },
  rest: { mp: 0, recastMs: 0 },
} as const;

/** Base auto-attack delay (ms) before haste. */
export const SWING_BASE_MS = 1600;

/** Per-second rest tick (server applies once per second while resting). */
export const REST_TICK = {
  hp: 8,
  mp: 6,
  tpDrain: 40,
} as const;

/** XP needed to go from `level` → `level + 1` (xp on character is progress within the level). */
export function xpToNextLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return 50 + lv * 50;
}

/** @deprecated Vitals come from jobVitalsAtLevel — kept for older imports. */
export const LEVEL_UP_BONUS = {
  maxHp: 10,
  maxMp: 6,
} as const;

export const MAX_LEVEL = 75;

export * from "./jobs";
export * from "./grades";
export * from "./tim-kit";
export * from "./knight-kit";
export * from "./rogue-kit";
export * from "./sorcerer-kit";
export * from "./fighter-kit";
export * from "./battlemage-kit";
export * from "./cleric-kit";
export * from "./shared-icons";
export * from "./dual-job";
export * from "./skill-tree";
export * from "./weapon-tp";
export * from "./abilities";

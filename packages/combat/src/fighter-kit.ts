import { isTrainerFreeAbility } from "./trainer";
/**

 * Fighter kit — raw melee DPS (jobs-from-plan §4.5).

 * Feel: two-hander, iron sparks, oxblood rage; WS / TP focus.

 * No native spells — no spellbook.

 * FX: iron sparks, blood-red rage — not magic circles.

 */



export const FIGHTER_ABILITY_IDS = [

  "rest",

  "killing_storm",

  "berserk",

  "warcry",

  "defender",

  "aggressor",

  "fi_provoke",

  "restraint",

  "blood_rage",

  "brazen_rush",

] as const;



export type FighterAbilityId = (typeof FIGHTER_ABILITY_IDS)[number];



export type FighterAbilityCategory = "utility" | "ja";



export type FighterAbilityDef = {

  id: FighterAbilityId;

  label: string;

  glyph: string;

  icon?: string;

  unlockLevel: number;

  /** Fighters have no MP — always 0. */

  mp: number;

  recastMs: number;

  category: FighterAbilityCategory;

  durationMs?: number;

  range?: number;

  aoe?: number;

  needsTarget?: boolean;

  weaponRequired?: boolean;

  /** Self attack multiplier while active (1 = none). */

  attMul?: number;

  /** Self defense multiplier while active (1 = none). */

  defMul?: number;

  /** Accuracy bonus while active. */

  accBonus?: number;

  /** Evasion penalty while active. */

  evaPenalty?: number;

  /** Party-wide attack multiplier (Warcry). */

  partyAttMul?: number;

  /** Party crit rate bonus (Blood Rage). */

  partyCritBonus?: number;

  /** All melee hits crit (Killing Storm). */

  allMeleeCrit?: boolean;

  /** TP gain multiplier (Restraint). */

  tpGainMul?: number;

  /** Double-attack proc rate bonus (Brazen Rush). */

  doubleAttackBonus?: number;

};



export const FIGHTER_ABILITIES: Record<FighterAbilityId, FighterAbilityDef> = {

  rest: {

    id: "rest",

    label: "Rest",

    glyph: "Rs",

    icon: "/icons/abilities/rest.png",

    unlockLevel: 1,

    mp: 0,

    recastMs: 0,

    category: "utility",

  },

  killing_storm: {

    id: "killing_storm",

    label: "Killing Storm",

    glyph: "Ks",

    unlockLevel: 1,

    mp: 0,

    recastMs: 2 * 60 * 60 * 1000,

    category: "ja",

    durationMs: 45_000,

    allMeleeCrit: true,

    weaponRequired: true,

  },

  berserk: {

    id: "berserk",

    label: "Berserk",

    glyph: "Bz",

    unlockLevel: 5,

    mp: 0,

    recastMs: 5 * 60_000,

    category: "ja",

    durationMs: 180_000,

    attMul: 1.25,

    defMul: 0.75,

    weaponRequired: true,

  },

  warcry: {

    id: "warcry",

    label: "Warcry",

    glyph: "Wc",

    unlockLevel: 15,

    mp: 0,

    recastMs: 5 * 60_000,

    category: "ja",

    durationMs: 30_000,

    partyAttMul: 1.15,

    aoe: 12,

  },

  defender: {

    id: "defender",

    label: "Defender",

    glyph: "Df",

    unlockLevel: 25,

    mp: 0,

    recastMs: 3 * 60_000,

    category: "ja",

    durationMs: 180_000,

    attMul: 0.75,

    defMul: 1.25,

    weaponRequired: true,

  },

  aggressor: {

    id: "aggressor",

    label: "Aggressor",

    glyph: "Ag",

    unlockLevel: 35,

    mp: 0,

    recastMs: 5 * 60_000,

    category: "ja",

    durationMs: 180_000,

    accBonus: 25,

    evaPenalty: 25,

    weaponRequired: true,

  },

  fi_provoke: {

    id: "fi_provoke",

    label: "Provoke",

    glyph: "Pv",

    unlockLevel: 45,

    mp: 0,

    recastMs: 30_000,

    category: "ja",

    range: 14,

    needsTarget: true,

    weaponRequired: true,

  },

  restraint: {

    id: "restraint",

    label: "Restraint",

    glyph: "Rt",

    unlockLevel: 55,

    mp: 0,

    recastMs: 10 * 60_000,

    category: "ja",

    durationMs: 180_000,

    tpGainMul: 1.5,

    weaponRequired: true,

  },

  blood_rage: {

    id: "blood_rage",

    label: "Blood Rage",

    glyph: "Br",

    unlockLevel: 65,

    mp: 0,

    recastMs: 10 * 60_000,

    category: "ja",

    durationMs: 30_000,

    partyCritBonus: 0.12,

    aoe: 12,

  },

  brazen_rush: {

    id: "brazen_rush",

    label: "Brazen Rush",

    glyph: "Bu",

    unlockLevel: 75,

    mp: 0,

    recastMs: 20 * 60_000,

    category: "ja",

    durationMs: 30_000,

    doubleAttackBonus: 0.45,

    weaponRequired: true,

  },

};



export const FIGHTER_ABILITY_BLURBS: Record<FighterAbilityId, string> = {

  rest: "Kneel to recover HP. Breaks on damage or move.",

  killing_storm:

    "2-hour: iron storm — every melee swing critical for 45s.",

  berserk: "Oxblood fury — attack +25%, defense −25% for 180s.",

  warcry: "Battle shout — party attack up for 30s.",

  defender: "Brace behind steel — defense up, attack down for 180s.",

  aggressor: "Press the foe — accuracy up, evasion down for 180s.",

  fi_provoke: "Spike enmity — pull hate for off-tank duty.",

  restraint: "Measured strikes — build weapon skill TP faster for 180s.",

  blood_rage: "Shared bloodlust — party crit chance up for 30s.",

  brazen_rush: "Relentless flurry — double-attack surge for 30s.",

};



export const FIGHTER_CATEGORY_TABS: { id: FighterAbilityCategory | "all"; label: string }[] = [

  { id: "all", label: "All" },

  { id: "ja", label: "Job" },

  { id: "utility", label: "Utility" },

];



export function isFighterAbilityId(id: string): id is FighterAbilityId {

  return Object.prototype.hasOwnProperty.call(FIGHTER_ABILITIES, id);

}



export function fighterAbilitiesUnlocked(
  level: number,
  learned: readonly string[] = [],
): FighterAbilityId[] {
  const learnedSet = new Set(learned);
  return FIGHTER_ABILITY_IDS.filter((id) => {
    if (FIGHTER_ABILITIES[id].unlockLevel > level) return false;
    if (isTrainerFreeAbility(id)) return true;
    return learnedSet.has(id);
  });
}



export function fighterHotbarOrder(unlocked: readonly FighterAbilityId[]): FighterAbilityId[] {

  const prefer: FighterAbilityId[] = [

    "berserk",

    "killing_storm",

    "warcry",

    "defender",

    "aggressor",

    "fi_provoke",

    "restraint",

    "blood_rage",

    "brazen_rush",

  ];

  const set = new Set(unlocked);

  const out: FighterAbilityId[] = [];

  for (const id of prefer) {

    if (set.has(id)) out.push(id);

  }

  for (const id of unlocked) {

    if (id === "rest") continue;

    if (!out.includes(id)) out.push(id);

  }

  return out;

}



export function fighterAbilityTooltip(id: FighterAbilityId): {

  title: string;

  body: string;

  meta: string;

} {

  const def = FIGHTER_ABILITIES[id];

  const bits: string[] = [`Lv ${def.unlockLevel}`];

  bits.push("No MP");

  if (def.recastMs > 0) {

    const s = def.recastMs / 1000;

    bits.push(s >= 3600 ? `CD ${Math.round(s / 3600)}h` : s >= 60 ? `CD ${Math.round(s / 60)}m` : `CD ${s}s`);

  }

  if (def.durationMs) bits.push(`Dur ${def.durationMs / 1000}s`);

  if (def.needsTarget) bits.push("Target");

  if (def.weaponRequired) bits.push("Greatsword");

  return { title: def.label, body: FIGHTER_ABILITY_BLURBS[id], meta: bits.join(" · ") };

}



export function fighterAbilityIconUrl(id: FighterAbilityId | string): string {

  if (isFighterAbilityId(id) && FIGHTER_ABILITIES[id].icon) return FIGHTER_ABILITIES[id].icon!;

  return `/icons/abilities/${id}.png`;

}



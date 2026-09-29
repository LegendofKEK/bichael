/**
 * Battle Mage kit — sword + en-spell hybrid (jobs-from-plan §4.6).
 * Feel: midline blade runes, cast between swings; teal / steel / bronze — not TIM chrona, not Sorcerer violet.
 */

import { SHARED_ABILITY_ICON } from "./shared-icons";
import { isTrainerFreeAbility } from "./trainer";

export const BATTLEMAGE_ABILITY_IDS = [
  "rest",
  // job abilities
  "spellblade",
  "convert",
  "corrupt",
  "focus_weave",
  "spontaneity",
  "lockspell",
  "widen",
  "full_circle",
  // en-spells
  "bm_flame_edge",
  "bm_frost_edge",
  "bm_thunder_edge",
  // healing (weaker than Cleric)
  "bm_cure",
  "bm_cure_ii",
  "bm_cure_iii",
  "bm_cure_iv",
  // enhancing
  "bm_protect",
  "bm_shell",
  "bm_phalanx",
  "bm_stoneskin",
  "bm_haste",
  "bm_refresh",
  "bm_refresh_ii",
  "bm_refreshga",
  // enfeebles
  "bm_dia",
  "bm_bio",
  "bm_slow",
  "bm_paralyze",
  "bm_silence",
  "bm_blind",
  "bm_gravity",
  "bm_dispel",
  "bm_bind",
  "bm_sleep",
  // nukes (I–III + limited ga)
  "bm_fire",
  "bm_fire_ii",
  "bm_fire_iii",
  "bm_blizzard",
  "bm_blizzard_ii",
  "bm_blizzard_iii",
  "bm_aero",
  "bm_aero_ii",
  "bm_thunder",
  "bm_thunder_ii",
  "bm_firaga",
] as const;

export type BattleMageAbilityId = (typeof BATTLEMAGE_ABILITY_IDS)[number];

export type BattleMageAbilityCategory =
  | "utility"
  | "ja"
  | "enspell"
  | "heal"
  | "enhance"
  | "enfeeble"
  | "nuke";

export type BattleMageAbilityDef = {
  id: BattleMageAbilityId;
  label: string;
  glyph: string;
  icon?: string;
  unlockLevel: number;
  mp: number;
  recastMs: number;
  category: BattleMageAbilityCategory;
  durationMs?: number;
  heal?: number;
  potency?: number;
  physDt?: number;
  magDt?: number;
  haste?: number;
  /** MP restored per second while Refresh is active. */
  refreshMp?: number;
  range?: number;
  aoe?: number;
  needsTarget?: boolean;
  weaponRequired?: boolean;
  /** En-spell bonus damage on melee while active. */
  enSpellBonus?: number;
  toggle?: boolean;
};

export const BATTLEMAGE_ABILITIES: Record<BattleMageAbilityId, BattleMageAbilityDef> = {
  rest: {
    id: "rest",
    label: "Rest",
    glyph: "Rs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 0,
    category: "utility",
  },
  spellblade: {
    id: "spellblade",
    label: "Blade Canticle",
    glyph: "Bc",
    unlockLevel: 1,
    mp: 0,
    recastMs: 2 * 60 * 60 * 1000,
    category: "ja",
    durationMs: 60_000,
  },
  convert: {
    id: "convert",
    label: "Vital Exchange",
    glyph: "Vx",
    unlockLevel: 15,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
  },
  corrupt: {
    id: "corrupt",
    label: "Hex Weave",
    glyph: "Hw",
    unlockLevel: 25,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
  },
  focus_weave: {
    id: "focus_weave",
    label: "Loom Ward",
    glyph: "Lw",
    unlockLevel: 35,
    mp: 0,
    recastMs: 0,
    category: "ja",
    toggle: true,
  },
  spontaneity: {
    id: "spontaneity",
    label: "Flash Cast",
    glyph: "Fc",
    unlockLevel: 45,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
  },
  lockspell: {
    id: "lockspell",
    label: "Seal Sigil",
    glyph: "Ss",
    unlockLevel: 55,
    mp: 0,
    recastMs: 15 * 60_000,
    category: "ja",
  },
  widen: {
    id: "widen",
    label: "Circle Loom",
    glyph: "Cl",
    unlockLevel: 65,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
  },
  full_circle: {
    id: "full_circle",
    label: "Rune Collapse",
    glyph: "Rc",
    unlockLevel: 75,
    mp: 0,
    recastMs: 20 * 60_000,
    category: "ja",
    potency: 220,
    range: 12,
    needsTarget: true,
  },
  bm_flame_edge: {
    id: "bm_flame_edge",
    label: "Cinder Edge",
    glyph: "Ce",
    unlockLevel: 5,
    mp: 12,
    recastMs: 0,
    category: "enspell",
    durationMs: 180_000,
    enSpellBonus: 14,
  },
  bm_frost_edge: {
    id: "bm_frost_edge",
    label: "Rime Edge",
    glyph: "Re",
    unlockLevel: 18,
    mp: 18,
    recastMs: 0,
    category: "enspell",
    durationMs: 180_000,
    enSpellBonus: 22,
  },
  bm_thunder_edge: {
    id: "bm_thunder_edge",
    label: "Storm Edge",
    glyph: "Se",
    unlockLevel: 32,
    mp: 24,
    recastMs: 0,
    category: "enspell",
    durationMs: 180_000,
    enSpellBonus: 32,
  },
  bm_cure: {
    id: "bm_cure",
    label: "Threadmend",
    glyph: "Tm",
    unlockLevel: 1,
    mp: 8,
    recastMs: 0,
    category: "heal",
    heal: 35,
  },
  bm_cure_ii: {
    id: "bm_cure_ii",
    label: "Threadmend II",
    glyph: "T2",
    unlockLevel: 11,
    mp: 16,
    recastMs: 0,
    category: "heal",
    heal: 75,
  },
  bm_cure_iii: {
    id: "bm_cure_iii",
    label: "Threadmend III",
    glyph: "T3",
    unlockLevel: 21,
    mp: 28,
    recastMs: 0,
    category: "heal",
    heal: 140,
  },
  bm_cure_iv: {
    id: "bm_cure_iv",
    label: "Threadmend IV",
    glyph: "T4",
    unlockLevel: 41,
    mp: 44,
    recastMs: 0,
    category: "heal",
    heal: 250,
  },
  bm_protect: {
    id: "bm_protect",
    label: "Bronze Weave",
    glyph: "Bw",
    unlockLevel: 10,
    mp: 10,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.88,
  },
  bm_shell: {
    id: "bm_shell",
    label: "Steel Weave",
    glyph: "Sw",
    unlockLevel: 14,
    mp: 12,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.88,
  },
  bm_phalanx: {
    id: "bm_phalanx",
    label: "Phalanx Rune",
    glyph: "Pr",
    unlockLevel: 22,
    mp: 18,
    recastMs: 0,
    category: "enhance",
    durationMs: 120_000,
    physDt: 0.75,
  },
  bm_stoneskin: {
    id: "bm_stoneskin",
    label: "Stoneskin Rune",
    glyph: "Sk",
    unlockLevel: 28,
    mp: 22,
    recastMs: 0,
    category: "enhance",
    durationMs: 300_000,
  },
  bm_haste: {
    id: "bm_haste",
    label: "Quickthread",
    glyph: "Qt",
    unlockLevel: 34,
    mp: 20,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    haste: 0.22,
  },
  bm_refresh: {
    id: "bm_refresh",
    label: "Mana Thread",
    glyph: "Mt",
    // ≤37 so L75 main + BM support (⌊75/2⌋) unlocks the first Refresh
    unlockLevel: 35,
    mp: 24,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    refreshMp: 4,
  },
  bm_refresh_ii: {
    id: "bm_refresh_ii",
    label: "Mana Thread II",
    glyph: "M2",
    unlockLevel: 55,
    mp: 40,
    recastMs: 0,
    category: "enhance",
    durationMs: 210_000,
    refreshMp: 8,
  },
  bm_refreshga: {
    id: "bm_refreshga",
    label: "Thread Circle",
    glyph: "Tc",
    unlockLevel: 70,
    mp: 72,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    refreshMp: 5,
    aoe: 10,
  },
  bm_dia: {
    id: "bm_dia",
    label: "Light Dia",
    glyph: "Ld",
    unlockLevel: 8,
    mp: 10,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 60_000,
    range: 12,
    needsTarget: true,
  },
  bm_bio: {
    id: "bm_bio",
    label: "Spore Thread",
    glyph: "St",
    unlockLevel: 14,
    mp: 14,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 90_000,
    potency: 8,
    range: 12,
    needsTarget: true,
  },
  bm_slow: {
    id: "bm_slow",
    label: "Drag Thread",
    glyph: "Dt",
    unlockLevel: 16,
    mp: 15,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 30_000,
    range: 12,
    needsTarget: true,
  },
  bm_paralyze: {
    id: "bm_paralyze",
    label: "Lock Thread",
    glyph: "Lt",
    unlockLevel: 22,
    mp: 18,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 45_000,
    range: 12,
    needsTarget: true,
  },
  bm_silence: {
    id: "bm_silence",
    label: "Mute Thread",
    glyph: "Mu",
    unlockLevel: 26,
    mp: 20,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 60_000,
    range: 12,
    needsTarget: true,
  },
  bm_blind: {
    id: "bm_blind",
    label: "Veil Thread",
    glyph: "Vt",
    unlockLevel: 30,
    mp: 18,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 45_000,
    range: 12,
    needsTarget: true,
  },
  bm_gravity: {
    id: "bm_gravity",
    label: "Weight Rune",
    glyph: "Wr",
    unlockLevel: 34,
    mp: 24,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 45_000,
    range: 12,
    needsTarget: true,
  },
  bm_dispel: {
    id: "bm_dispel",
    label: "Unravel",
    glyph: "Ur",
    unlockLevel: 38,
    mp: 18,
    recastMs: 0,
    category: "enfeeble",
    range: 12,
    needsTarget: true,
  },
  bm_bind: {
    id: "bm_bind",
    label: "Chain Rune",
    glyph: "Cr",
    unlockLevel: 44,
    mp: 28,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 30_000,
    range: 12,
    needsTarget: true,
  },
  bm_sleep: {
    id: "bm_sleep",
    label: "Dream Thread",
    glyph: "Dr",
    unlockLevel: 50,
    mp: 30,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 45_000,
    range: 12,
    needsTarget: true,
  },
  bm_fire: {
    id: "bm_fire",
    label: "Ember Sigil",
    glyph: "E1",
    unlockLevel: 10,
    mp: 14,
    recastMs: 0,
    category: "nuke",
    potency: 42,
    range: 12,
    needsTarget: true,
  },
  bm_fire_ii: {
    id: "bm_fire_ii",
    label: "Ember Sigil II",
    glyph: "E2",
    unlockLevel: 28,
    mp: 32,
    recastMs: 0,
    category: "nuke",
    potency: 95,
    range: 12,
    needsTarget: true,
  },
  bm_fire_iii: {
    id: "bm_fire_iii",
    label: "Ember Sigil III",
    glyph: "E3",
    unlockLevel: 46,
    mp: 52,
    recastMs: 0,
    category: "nuke",
    potency: 165,
    range: 12,
    needsTarget: true,
  },
  bm_blizzard: {
    id: "bm_blizzard",
    label: "Rime Sigil",
    glyph: "R1",
    unlockLevel: 12,
    mp: 14,
    recastMs: 0,
    category: "nuke",
    potency: 44,
    range: 12,
    needsTarget: true,
  },
  bm_blizzard_ii: {
    id: "bm_blizzard_ii",
    label: "Rime Sigil II",
    glyph: "R2",
    unlockLevel: 30,
    mp: 34,
    recastMs: 0,
    category: "nuke",
    potency: 98,
    range: 12,
    needsTarget: true,
  },
  bm_blizzard_iii: {
    id: "bm_blizzard_iii",
    label: "Rime Sigil III",
    glyph: "R3",
    unlockLevel: 48,
    mp: 54,
    recastMs: 0,
    category: "nuke",
    potency: 170,
    range: 12,
    needsTarget: true,
  },
  bm_aero: {
    id: "bm_aero",
    label: "Gale Sigil",
    glyph: "G1",
    unlockLevel: 16,
    mp: 16,
    recastMs: 0,
    category: "nuke",
    potency: 48,
    range: 12,
    needsTarget: true,
  },
  bm_aero_ii: {
    id: "bm_aero_ii",
    label: "Gale Sigil II",
    glyph: "G2",
    unlockLevel: 34,
    mp: 36,
    recastMs: 0,
    category: "nuke",
    potency: 105,
    range: 12,
    needsTarget: true,
  },
  bm_thunder: {
    id: "bm_thunder",
    label: "Volt Sigil",
    glyph: "V1",
    unlockLevel: 20,
    mp: 18,
    recastMs: 0,
    category: "nuke",
    potency: 52,
    range: 12,
    needsTarget: true,
  },
  bm_thunder_ii: {
    id: "bm_thunder_ii",
    label: "Volt Sigil II",
    glyph: "V2",
    unlockLevel: 38,
    mp: 38,
    recastMs: 0,
    category: "nuke",
    potency: 112,
    range: 12,
    needsTarget: true,
  },
  bm_firaga: {
    id: "bm_firaga",
    label: "Ember Bloom",
    glyph: "Eb",
    unlockLevel: 55,
    mp: 62,
    recastMs: 0,
    category: "nuke",
    potency: 130,
    range: 12,
    aoe: 8,
    needsTarget: true,
  },
};

export const BATTLEMAGE_ABILITY_BLURBS: Record<BattleMageAbilityId, string> = {
  rest: "Kneel to recover HP and MP. Breaks on damage or move.",
  spellblade: "2-hour: for 60s your spells cost no MP and ignore recast (cast time remains).",
  convert: "Swap your remaining HP and MP pools.",
  corrupt: "Next enfeeble hits harder and lasts longer.",
  focus_weave: "Toggle: your self-enhances last much longer.",
  spontaneity: "Your next spell fires instantly.",
  lockspell: "Your next enfeeble is nearly irresistible.",
  widen: "Your next enhance spreads to nearby allies.",
  full_circle: "Dump your active en-spell into a burst nuke on the target.",
  bm_flame_edge: "Teal-cinder runes on the blade — bonus fire on swings.",
  bm_frost_edge: "Rime runes — bonus ice on swings.",
  bm_thunder_edge: "Storm runes — bonus thunder on swings.",
  bm_cure: "Quick thread mend — weaker than a Cleric's cure.",
  bm_cure_ii: "Stronger thread mend.",
  bm_cure_iii: "Major thread mend.",
  bm_cure_iv: "Peak thread mend for a hybrid.",
  bm_protect: "Bronze weave — soften physical blows.",
  bm_shell: "Steel weave — soften magic.",
  bm_phalanx: "Runic phalanx — strong physical barrier.",
  bm_stoneskin: "Stone runes absorb a chunk of damage.",
  bm_haste: "Quickthread — modest magical haste (not TIM tempo).",
  bm_refresh: "Mana thread — steady MP recovery.",
  bm_refresh_ii: "Stronger mana thread — faster MP recovery.",
  bm_refreshga: "Thread circle — Refresh on nearby allies.",
  bm_dia: "Light dia — erodes defense over time.",
  bm_bio: "Spore thread — poison damage over time.",
  bm_slow: "Drag thread — slow enemy swings.",
  bm_paralyze: "Lock thread — chance to seize the foe.",
  bm_silence: "Mute thread — foe forgets to fight.",
  bm_blind: "Veil thread — wild, inaccurate swings.",
  bm_gravity: "Weight rune — heavy steps, slow swings.",
  bm_dispel: "Unravel — strip a foe's buffs.",
  bm_bind: "Chain rune — root the target.",
  bm_sleep: "Dream thread — deep sleep (broken by damage).",
  bm_fire: "Teal-flame sigil bolt.",
  bm_fire_ii: "Stronger ember sigil.",
  bm_fire_iii: "Heavy ember sigil.",
  bm_blizzard: "Rime sigil shard.",
  bm_blizzard_ii: "Stronger rime sigil.",
  bm_blizzard_iii: "Heavy rime sigil.",
  bm_aero: "Gale sigil cut.",
  bm_aero_ii: "Strong gale sigil.",
  bm_thunder: "Volt sigil strike.",
  bm_thunder_ii: "Strong volt sigil.",
  bm_firaga: "Ember bloom — modest AoE fire.",
};

export const BATTLEMAGE_CATEGORY_TABS: { id: BattleMageAbilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ja", label: "Job" },
  { id: "enspell", label: "En-spell" },
  { id: "nuke", label: "Elemental" },
  { id: "enfeeble", label: "Enfeeble" },
  { id: "enhance", label: "Enhance" },
  { id: "heal", label: "Heal" },
  { id: "utility", label: "Utility" },
];

export function isBattleMageAbilityId(id: string): id is BattleMageAbilityId {
  return Object.prototype.hasOwnProperty.call(BATTLEMAGE_ABILITIES, id);
}

export function battleMageAbilitiesUnlocked(
  level: number,
  learned: readonly string[] = [],
): BattleMageAbilityId[] {
  const learnedSet = new Set(learned);
  return BATTLEMAGE_ABILITY_IDS.filter((id) => {
    if (BATTLEMAGE_ABILITIES[id].unlockLevel > level) return false;
    if (isTrainerFreeAbility(id)) return true;
    return learnedSet.has(id);
  });
}

export function battleMageHotbarOrder(unlocked: readonly BattleMageAbilityId[]): BattleMageAbilityId[] {
  const prefer: BattleMageAbilityId[] = [
    "bm_flame_edge",
    "spellblade",
    "bm_fire",
    "bm_cure",
    "convert",
    "corrupt",
    "bm_thunder_edge",
    "bm_protect",
    "spontaneity",
    "bm_slow",
    "full_circle",
    "bm_firaga",
  ];
  const set = new Set(unlocked);
  const out: BattleMageAbilityId[] = [];
  for (const id of prefer) {
    if (set.has(id) && id !== "rest") out.push(id);
  }
  for (const id of unlocked) {
    if (id === "rest") continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function battleMageAbilityTooltip(id: BattleMageAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const def = BATTLEMAGE_ABILITIES[id];
  const blurb = BATTLEMAGE_ABILITY_BLURBS[id];
  const bits: string[] = [`Lv ${def.unlockLevel}`];
  if (def.mp > 0) bits.push(`MP ${def.mp}`);
  else if (def.category === "ja") bits.push("No MP");
  if (def.recastMs > 0) {
    const s = def.recastMs / 1000;
    bits.push(s >= 3600 ? `CD ${Math.round(s / 3600)}h` : s >= 60 ? `CD ${Math.round(s / 60)}m` : `CD ${s}s`);
  }
  if (def.durationMs) bits.push(`Dur ${def.durationMs / 1000}s`);
  if (def.heal) bits.push(`Heal ~${def.heal}`);
  if (def.potency) bits.push(`Potency ${def.potency}`);
  if (def.enSpellBonus) bits.push(`+${def.enSpellBonus} swing`);
  if (def.haste) bits.push(`Haste +${Math.round(def.haste * 100)}%`);
  if (def.refreshMp) bits.push(`Refresh +${def.refreshMp} MP/s`);
  if (def.aoe) bits.push(`AoE ${def.aoe}`);
  if (def.physDt != null && def.physDt < 1) {
    bits.push(`Phys DT −${Math.round((1 - def.physDt) * 100)}%`);
  }
  if (def.magDt != null && def.magDt < 1) {
    bits.push(`Magic DT −${Math.round((1 - def.magDt) * 100)}%`);
  }
  if (def.needsTarget) bits.push("Target");
  if (def.weaponRequired) bits.push("Sword");
  if (def.toggle) bits.push("Toggle");
  return { title: def.label, body: blurb, meta: bits.join(" · ") };
}

export function battleMageAbilityIconUrl(id: BattleMageAbilityId | string): string {
  const shared = SHARED_ABILITY_ICON[id];
  if (shared) return shared;
  if (isBattleMageAbilityId(id) && BATTLEMAGE_ABILITIES[id].icon) return BATTLEMAGE_ABILITIES[id].icon!;
  return `/icons/abilities/${id}.png`;
}

/**
 * Knight kit — shield tank (jobs-from-plan §4.1).
 * Feel: slow, loud, shield-forward; hate tools first.
 * FX: silver flash, crimson shield, pale-gold divine — not TIM teal / not Cleric sky-blue.
 */

import { SHARED_ABILITY_ICON } from "./shared-icons";

export const KNIGHT_ABILITY_IDS = [
  // utility
  "rest",
  // job abilities
  "bulwark",
  "provoke",
  "shield_bash",
  "cover",
  "rampart",
  "sentinel",
  "fealty",
  "chivalry",
  "guardian",
  // sparse divine / healing / enhancing
  "kn_cure",
  "kn_banish",
  "kn_protect",
  "kn_flash",
  "kn_cure_ii",
  "kn_shell",
  "kn_protect_ii",
  "kn_cure_iii",
  "kn_shell_ii",
  "kn_protect_iii",
  "kn_shell_iii",
  "kn_cure_iv",
  "kn_banish_ii",
  "kn_holy",
] as const;

export type KnightAbilityId = (typeof KNIGHT_ABILITY_IDS)[number];

export type KnightAbilityCategory = "utility" | "ja" | "heal" | "divine" | "enhance" | "enfeeble";

export type KnightAbilityDef = {
  id: KnightAbilityId;
  label: string;
  glyph: string;
  icon?: string;
  unlockLevel: number;
  mp: number;
  recastMs: number;
  category: KnightAbilityCategory;
  durationMs?: number;
  heal?: number;
  /** Magical / divine nuke power. */
  potency?: number;
  /** Physical damage taken multiplier while buff active (1 = full, 0 = immune). */
  physDt?: number;
  /** Magical damage taken multiplier. */
  magDt?: number;
  range?: number;
  aoe?: number;
  needsTarget?: boolean;
  /** Requires sword+shield / main hand. */
  weaponRequired?: boolean;
};

export const KNIGHT_ABILITIES: Record<KnightAbilityId, KnightAbilityDef> = {
  rest: {
    id: "rest",
    label: "Rest",
    glyph: "Rs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 0,
    category: "utility",
  },
  bulwark: {
    id: "bulwark",
    label: "Iron Bastion",
    glyph: "Ib",
    unlockLevel: 1,
    mp: 0,
    recastMs: 2 * 60 * 60 * 1000,
    category: "ja",
    durationMs: 30_000,
    physDt: 0,
  },
  provoke: {
    id: "provoke",
    label: "Warhorn",
    glyph: "Wh",
    unlockLevel: 5,
    mp: 0,
    recastMs: 30_000,
    category: "ja",
    range: 14,
    needsTarget: true,
  },
  shield_bash: {
    id: "shield_bash",
    label: "Buckler Crash",
    glyph: "Bc",
    unlockLevel: 15,
    mp: 0,
    recastMs: 60_000,
    category: "ja",
    durationMs: 5_000,
    potency: 28,
    range: 3,
    needsTarget: true,
    weaponRequired: true,
  },
  cover: {
    id: "cover",
    label: "Interpose",
    glyph: "In",
    unlockLevel: 25,
    mp: 0,
    recastMs: 3 * 60_000,
    category: "ja",
    durationMs: 15_000,
    physDt: 0.75,
  },
  rampart: {
    id: "rampart",
    label: "Bastion Cry",
    glyph: "By",
    unlockLevel: 35,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    durationMs: 30_000,
    physDt: 0.75,
    aoe: 10,
  },
  sentinel: {
    id: "sentinel",
    label: "Holdfast",
    glyph: "Hf",
    unlockLevel: 45,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    durationMs: 30_000,
    physDt: 0.5,
  },
  fealty: {
    id: "fealty",
    label: "Oathbound",
    glyph: "Ob",
    unlockLevel: 55,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
    durationMs: 60_000,
    magDt: 0.5,
  },
  chivalry: {
    id: "chivalry",
    label: "Valor Tithe",
    glyph: "Vt",
    unlockLevel: 65,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
  },
  guardian: {
    id: "guardian",
    label: "Hall Aegis",
    glyph: "Ha",
    unlockLevel: 75,
    mp: 0,
    recastMs: 20 * 60_000,
    category: "ja",
    durationMs: 20_000,
    physDt: 0.65,
    aoe: 12,
  },
  kn_cure: {
    id: "kn_cure",
    label: "Ashmend",
    glyph: "Am",
    unlockLevel: 5,
    mp: 8,
    recastMs: 0,
    category: "heal",
    heal: 45,
  },
  kn_banish: {
    id: "kn_banish",
    label: "Ashlight",
    glyph: "Al",
    unlockLevel: 7,
    mp: 12,
    recastMs: 0,
    category: "divine",
    potency: 55,
    range: 12,
    needsTarget: true,
  },
  kn_protect: {
    id: "kn_protect",
    label: "Plate Ward",
    glyph: "Pw",
    unlockLevel: 17,
    mp: 10,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.9,
  },
  kn_flash: {
    id: "kn_flash",
    label: "Silver Flare",
    glyph: "Sf",
    unlockLevel: 20,
    mp: 18,
    recastMs: 45_000,
    category: "enfeeble",
    durationMs: 12_000,
    range: 10,
    aoe: 8,
  },
  kn_cure_ii: {
    id: "kn_cure_ii",
    label: "Ashmend II",
    glyph: "A2",
    unlockLevel: 30,
    mp: 18,
    recastMs: 0,
    category: "heal",
    heal: 95,
  },
  kn_shell: {
    id: "kn_shell",
    label: "Spirit Plate",
    glyph: "Sp",
    unlockLevel: 34,
    mp: 12,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.9,
  },
  kn_protect_ii: {
    id: "kn_protect_ii",
    label: "Plate Ward II",
    glyph: "W2",
    unlockLevel: 37,
    mp: 22,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.82,
  },
  kn_cure_iii: {
    id: "kn_cure_iii",
    label: "Ashmend III",
    glyph: "A3",
    unlockLevel: 45,
    mp: 36,
    recastMs: 0,
    category: "heal",
    heal: 180,
  },
  kn_shell_ii: {
    id: "kn_shell_ii",
    label: "Spirit Plate II",
    glyph: "P2",
    unlockLevel: 47,
    mp: 24,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.82,
  },
  kn_protect_iii: {
    id: "kn_protect_iii",
    label: "Plate Ward III",
    glyph: "W3",
    unlockLevel: 55,
    mp: 40,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.72,
  },
  kn_shell_iii: {
    id: "kn_shell_iii",
    label: "Spirit Plate III",
    glyph: "P3",
    unlockLevel: 57,
    mp: 42,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.72,
  },
  kn_cure_iv: {
    id: "kn_cure_iv",
    label: "Ashmend IV",
    glyph: "A4",
    unlockLevel: 65,
    mp: 55,
    recastMs: 0,
    category: "heal",
    heal: 320,
  },
  kn_banish_ii: {
    id: "kn_banish_ii",
    label: "Ashlight II",
    glyph: "L2",
    unlockLevel: 70,
    mp: 48,
    recastMs: 0,
    category: "divine",
    potency: 140,
    range: 12,
    needsTarget: true,
  },
  kn_holy: {
    id: "kn_holy",
    label: "Pale Judgment",
    glyph: "Pj",
    unlockLevel: 75,
    mp: 80,
    recastMs: 30_000,
    category: "divine",
    potency: 280,
    range: 12,
    needsTarget: true,
  },
};

export const KNIGHT_ABILITY_BLURBS: Record<KnightAbilityId, string> = {
  rest: "Kneel to recover HP and MP. Breaks on damage or move.",
  bulwark: "2-hour: shrug off all physical damage for 30s. Magic still bites.",
  provoke: "Sound the horn — force the foe to face you.",
  shield_bash: "Crash the buckler: damage and a short stun.",
  cover: "Step in — take the blow yourself.",
  rampart: "Raise the hall wall — nearby allies take less physical damage.",
  sentinel: "Holdfast: heavy physical mitigation and hate.",
  fealty: "Oath of steel — strong magic damage reduction.",
  chivalry: "Tithe fighting spirit (TP) into mana.",
  guardian: "Hall Aegis — party-wide cover for a short time.",
  kn_cure: "Modest ash-dust mend.",
  kn_banish: "Pale ashlight smite. Builds enmity.",
  kn_protect: "Plate ward vs physical blows.",
  kn_flash: "Silver flare — blind and seize enmity in a radius.",
  kn_cure_ii: "Stronger ash-dust mend.",
  kn_shell: "Spirit plate vs magic.",
  kn_protect_ii: "Improved plate ward.",
  kn_cure_iii: "Major ash-dust mend.",
  kn_shell_ii: "Improved spirit plate.",
  kn_protect_iii: "Superior plate ward.",
  kn_shell_iii: "Superior spirit plate.",
  kn_cure_iv: "Peak ash-dust mend.",
  kn_banish_ii: "Heavy ashlight smite.",
  kn_holy: "Pale Judgment — blinding enmity nuke.",
};

export const KNIGHT_CATEGORY_TABS: { id: KnightAbilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ja", label: "Job" },
  { id: "heal", label: "Heal" },
  { id: "divine", label: "Divine" },
  { id: "enhance", label: "Enhance" },
  { id: "enfeeble", label: "Hate" },
  { id: "utility", label: "Utility" },
];

export function isKnightAbilityId(id: string): id is KnightAbilityId {
  return Object.prototype.hasOwnProperty.call(KNIGHT_ABILITIES, id);
}

/** Knight spells unlock by level (no separate trainer in MVP). */
export function isKnightSpell(id: KnightAbilityId): boolean {
  const cat = KNIGHT_ABILITIES[id].category;
  return cat === "heal" || cat === "divine" || cat === "enhance" || cat === "enfeeble";
}

export function knightAbilitiesUnlocked(level: number): KnightAbilityId[] {
  return KNIGHT_ABILITY_IDS.filter((id) => KNIGHT_ABILITIES[id].unlockLevel <= level);
}

/** Preferred hotbar order — hate tools and DT first. */
export function knightHotbarOrder(unlocked: readonly KnightAbilityId[]): KnightAbilityId[] {
  const prefer: KnightAbilityId[] = [
    "provoke",
    "kn_flash",
    "shield_bash",
    "bulwark",
    "sentinel",
    "rampart",
    "cover",
    "kn_protect",
    "kn_cure",
    "kn_banish",
    "fealty",
    "chivalry",
    "guardian",
    "kn_holy",
  ];
  const set = new Set(unlocked);
  const out: KnightAbilityId[] = [];
  for (const id of prefer) {
    if (set.has(id) && id !== "rest") out.push(id);
  }
  for (const id of unlocked) {
    if (id === "rest") continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function knightAbilityTooltip(id: KnightAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const def = KNIGHT_ABILITIES[id];
  const blurb = KNIGHT_ABILITY_BLURBS[id];
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
  if (def.physDt != null && def.physDt < 1) {
    bits.push(def.physDt === 0 ? "Phys immune" : `Phys DT −${Math.round((1 - def.physDt) * 100)}%`);
  }
  if (def.magDt != null && def.magDt < 1) {
    bits.push(`Magic DT −${Math.round((1 - def.magDt) * 100)}%`);
  }
  if (def.needsTarget) bits.push("Target");
  if (def.weaponRequired) bits.push("Sword");
  return { title: def.label, body: blurb, meta: bits.join(" · ") };
}

export function knightAbilityIconUrl(id: KnightAbilityId | string): string {
  const shared = SHARED_ABILITY_ICON[id];
  if (shared) return shared;
  if (isKnightAbilityId(id) && KNIGHT_ABILITIES[id].icon) return KNIGHT_ABILITIES[id].icon!;
  return `/icons/abilities/${id}.png`;
}

/**
 * Cleric kit — primary healer (jobs-from-plan §4.3).
 * Feel: white / sky-blue / soft gold divine light; owns Raise and -na.
 * FX distinct from Knight pale-gold wards and TIM teal chrona.
 */

import { SHARED_ABILITY_ICON } from "./shared-icons";

export const CLERIC_ABILITY_IDS = [
  "rest",
  // job abilities
  "sacred_mercy",
  "divine_seal",
  "solace_rite",
  "martyr",
  "misery_rite",
  "devotion",
  "asylum",
  // cure line
  "cl_cure",
  "cl_cure_ii",
  "cl_cure_iii",
  "cl_cure_iv",
  "cl_cure_v",
  "cl_curaga",
  "cl_curaga_ii",
  "cl_curaga_iii",
  // status / raise
  "cl_poisona",
  "cl_paralyna",
  "cl_blindna",
  "cl_silena",
  "cl_viruna",
  "cl_stona",
  "cl_cursna",
  "cl_erase",
  "cl_raise",
  "cl_raise_ii",
  "cl_reraise",
  // regen
  "cl_regen",
  "cl_regen_ii",
  "cl_regen_iii",
  // wards
  "cl_protect",
  "cl_protect_ii",
  "cl_protect_iii",
  "cl_protectra",
  "cl_shell",
  "cl_shell_ii",
  "cl_shell_iii",
  "cl_shellra",
  // tempo / divine / enfeeble
  "cl_haste",
  "cl_banish",
  "cl_banish_ii",
  "cl_holy",
  "cl_slow",
  "cl_paralyze",
  "cl_silence",
  "cl_flash",
] as const;

export type ClericAbilityId = (typeof CLERIC_ABILITY_IDS)[number];

export type ClericAbilityCategory =
  | "utility"
  | "ja"
  | "heal"
  | "na"
  | "raise"
  | "regen"
  | "enhance"
  | "divine"
  | "enfeeble";

export type ClericAbilityDef = {
  id: ClericAbilityId;
  label: string;
  glyph: string;
  icon?: string;
  unlockLevel: number;
  mp: number;
  recastMs: number;
  category: ClericAbilityCategory;
  durationMs?: number;
  heal?: number;
  /** Regen tick HP (applied every 3s server-side while active). */
  regenTick?: number;
  potency?: number;
  physDt?: number;
  magDt?: number;
  haste?: number;
  range?: number;
  aoe?: number;
  needsTarget?: boolean;
  /** Heal/raise/buff another player when targeted; otherwise self. */
  allyTarget?: boolean;
  staffRequired?: boolean;
  /** Toggle JA — no recast on toggle off. */
  toggle?: boolean;
};

export const CLERIC_ABILITIES: Record<ClericAbilityId, ClericAbilityDef> = {
  rest: {
    id: "rest",
    label: "Rest",
    glyph: "Rs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 0,
    category: "utility",
  },
  sacred_mercy: {
    id: "sacred_mercy",
    label: "Sacred Mercy",
    glyph: "Sm",
    unlockLevel: 1,
    mp: 0,
    recastMs: 2 * 60 * 60 * 1000,
    category: "ja",
    aoe: 14,
  },
  divine_seal: {
    id: "divine_seal",
    label: "Divine Seal",
    glyph: "Ds",
    unlockLevel: 15,
    mp: 0,
    recastMs: 10 * 60 * 1000,
    category: "ja",
    durationMs: 60_000,
  },
  solace_rite: {
    id: "solace_rite",
    label: "Solace Rite",
    glyph: "Sr",
    unlockLevel: 30,
    mp: 0,
    recastMs: 0,
    category: "ja",
    toggle: true,
  },
  martyr: {
    id: "martyr",
    label: "Martyr",
    glyph: "Ma",
    unlockLevel: 40,
    mp: 0,
    recastMs: 10 * 60 * 1000,
    category: "ja",
    durationMs: 30_000,
    allyTarget: true,
    range: 12,
  },
  misery_rite: {
    id: "misery_rite",
    label: "Misery Rite",
    glyph: "Mr",
    unlockLevel: 50,
    mp: 0,
    recastMs: 0,
    category: "ja",
    toggle: true,
  },
  devotion: {
    id: "devotion",
    label: "Devotion",
    glyph: "Dv",
    unlockLevel: 60,
    mp: 0,
    recastMs: 10 * 60 * 1000,
    category: "ja",
    allyTarget: true,
    range: 12,
  },
  asylum: {
    id: "asylum",
    label: "Asylum",
    glyph: "As",
    unlockLevel: 75,
    mp: 0,
    recastMs: 20 * 60 * 1000,
    category: "ja",
    durationMs: 30_000,
    magDt: 0.7,
    aoe: 14,
  },

  cl_cure: {
    id: "cl_cure",
    label: "Ashmend",
    glyph: "Am",
    unlockLevel: 1,
    mp: 10,
    recastMs: 5_000,
    category: "heal",
    heal: 58,
    allyTarget: true,
    range: 12,
  },
  cl_cure_ii: {
    id: "cl_cure_ii",
    label: "Ashmend II",
    glyph: "A2",
    unlockLevel: 11,
    mp: 22,
    recastMs: 6_000,
    category: "heal",
    heal: 135,
    allyTarget: true,
    range: 12,
  },
  cl_cure_iii: {
    id: "cl_cure_iii",
    label: "Ashmend III",
    glyph: "A3",
    unlockLevel: 21,
    mp: 42,
    recastMs: 7_000,
    category: "heal",
    heal: 270,
    allyTarget: true,
    range: 12,
  },
  cl_cure_iv: {
    id: "cl_cure_iv",
    label: "Ashmend IV",
    glyph: "A4",
    unlockLevel: 41,
    mp: 72,
    recastMs: 8_000,
    category: "heal",
    heal: 500,
    allyTarget: true,
    range: 12,
  },
  cl_cure_v: {
    id: "cl_cure_v",
    label: "Ashmend V",
    glyph: "A5",
    unlockLevel: 61,
    mp: 100,
    recastMs: 10_000,
    category: "heal",
    heal: 720,
    allyTarget: true,
    range: 12,
  },
  cl_curaga: {
    id: "cl_curaga",
    label: "Ashwell",
    glyph: "Aw",
    unlockLevel: 16,
    mp: 38,
    recastMs: 8_000,
    category: "heal",
    heal: 90,
    aoe: 10,
  },
  cl_curaga_ii: {
    id: "cl_curaga_ii",
    label: "Ashwell II",
    glyph: "W2",
    unlockLevel: 40,
    mp: 62,
    recastMs: 10_000,
    category: "heal",
    heal: 200,
    aoe: 10,
  },
  cl_curaga_iii: {
    id: "cl_curaga_iii",
    label: "Ashwell III",
    glyph: "W3",
    unlockLevel: 60,
    mp: 88,
    recastMs: 12_000,
    category: "heal",
    heal: 380,
    aoe: 10,
  },

  cl_poisona: {
    id: "cl_poisona",
    label: "Toxin Lapse",
    glyph: "Tl",
    unlockLevel: 10,
    mp: 8,
    recastMs: 5_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_paralyna: {
    id: "cl_paralyna",
    label: "Nerve Unbind",
    glyph: "Nu",
    unlockLevel: 15,
    mp: 12,
    recastMs: 5_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_blindna: {
    id: "cl_blindna",
    label: "Sight Mend",
    glyph: "Sm",
    unlockLevel: 20,
    mp: 14,
    recastMs: 5_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_silena: {
    id: "cl_silena",
    label: "Voice Restore",
    glyph: "Vr",
    unlockLevel: 25,
    mp: 16,
    recastMs: 5_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_viruna: {
    id: "cl_viruna",
    label: "Fever Break",
    glyph: "Fb",
    unlockLevel: 30,
    mp: 18,
    recastMs: 5_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_stona: {
    id: "cl_stona",
    label: "Stone Release",
    glyph: "Sr",
    unlockLevel: 40,
    mp: 28,
    recastMs: 8_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_cursna: {
    id: "cl_cursna",
    label: "Hex Lapse",
    glyph: "Hl",
    unlockLevel: 50,
    mp: 36,
    recastMs: 10_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },
  cl_erase: {
    id: "cl_erase",
    label: "Veil Scour",
    glyph: "Vs",
    unlockLevel: 45,
    mp: 32,
    recastMs: 8_000,
    category: "na",
    allyTarget: true,
    range: 12,
  },

  cl_raise: {
    id: "cl_raise",
    label: "Sunrise Recall",
    glyph: "Rc",
    unlockLevel: 25,
    mp: 120,
    recastMs: 60_000,
    category: "raise",
    heal: 200,
    allyTarget: true,
    range: 12,
  },
  cl_raise_ii: {
    id: "cl_raise_ii",
    label: "Sunrise Recall II",
    glyph: "R2",
    unlockLevel: 50,
    mp: 150,
    recastMs: 60_000,
    category: "raise",
    heal: 400,
    allyTarget: true,
    range: 12,
  },
  cl_reraise: {
    id: "cl_reraise",
    label: "Ember Vigil",
    glyph: "Ev",
    unlockLevel: 33,
    mp: 80,
    recastMs: 0,
    category: "raise",
    durationMs: 600_000,
    allyTarget: true,
    range: 12,
  },

  cl_regen: {
    id: "cl_regen",
    label: "Gentle Pulse",
    glyph: "Gp",
    unlockLevel: 21,
    mp: 24,
    recastMs: 12_000,
    category: "regen",
    durationMs: 75_000,
    regenTick: 12,
    allyTarget: true,
    range: 12,
  },
  cl_regen_ii: {
    id: "cl_regen_ii",
    label: "Gentle Pulse II",
    glyph: "G2",
    unlockLevel: 44,
    mp: 40,
    recastMs: 14_000,
    category: "regen",
    durationMs: 90_000,
    regenTick: 22,
    allyTarget: true,
    range: 12,
  },
  cl_regen_iii: {
    id: "cl_regen_iii",
    label: "Gentle Pulse III",
    glyph: "G3",
    unlockLevel: 66,
    mp: 58,
    recastMs: 16_000,
    category: "regen",
    durationMs: 120_000,
    regenTick: 35,
    allyTarget: true,
    range: 12,
  },

  cl_protect: {
    id: "cl_protect",
    label: "Sky Ward",
    glyph: "Sw",
    unlockLevel: 10,
    mp: 12,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.88,
    allyTarget: true,
    range: 12,
  },
  cl_protect_ii: {
    id: "cl_protect_ii",
    label: "Sky Ward II",
    glyph: "S2",
    unlockLevel: 25,
    mp: 26,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.8,
    allyTarget: true,
    range: 12,
  },
  cl_protect_iii: {
    id: "cl_protect_iii",
    label: "Sky Ward III",
    glyph: "S3",
    unlockLevel: 52,
    mp: 44,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.7,
    allyTarget: true,
    range: 12,
  },
  cl_protectra: {
    id: "cl_protectra",
    label: "Sky Ward Mass",
    glyph: "Sm",
    unlockLevel: 70,
    mp: 70,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    physDt: 0.75,
    aoe: 10,
  },
  cl_shell: {
    id: "cl_shell",
    label: "Bell Aegis",
    glyph: "Ba",
    unlockLevel: 12,
    mp: 14,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.88,
    allyTarget: true,
    range: 12,
  },
  cl_shell_ii: {
    id: "cl_shell_ii",
    label: "Bell Aegis II",
    glyph: "B2",
    unlockLevel: 28,
    mp: 28,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.8,
    allyTarget: true,
    range: 12,
  },
  cl_shell_iii: {
    id: "cl_shell_iii",
    label: "Bell Aegis III",
    glyph: "B3",
    unlockLevel: 55,
    mp: 46,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.7,
    allyTarget: true,
    range: 12,
  },
  cl_shellra: {
    id: "cl_shellra",
    label: "Bell Aegis Mass",
    glyph: "Bm",
    unlockLevel: 75,
    mp: 72,
    recastMs: 0,
    category: "enhance",
    durationMs: 180_000,
    magDt: 0.75,
    aoe: 10,
  },

  cl_haste: {
    id: "cl_haste",
    label: "Sunstride",
    glyph: "Ss",
    unlockLevel: 40,
    mp: 44,
    recastMs: 20_000,
    category: "enhance",
    haste: 0.22,
    durationMs: 180_000,
    allyTarget: true,
    range: 12,
  },

  cl_banish: {
    id: "cl_banish",
    label: "Daybreak Ray",
    glyph: "Dr",
    unlockLevel: 8,
    mp: 14,
    recastMs: 0,
    category: "divine",
    potency: 65,
    range: 12,
    needsTarget: true,
  },
  cl_banish_ii: {
    id: "cl_banish_ii",
    label: "Daybreak Ray II",
    glyph: "D2",
    unlockLevel: 58,
    mp: 52,
    recastMs: 0,
    category: "divine",
    potency: 155,
    range: 12,
    needsTarget: true,
  },
  cl_holy: {
    id: "cl_holy",
    label: "Bell Judgment",
    glyph: "Bj",
    unlockLevel: 72,
    mp: 90,
    recastMs: 30_000,
    category: "divine",
    potency: 300,
    range: 12,
    needsTarget: true,
  },

  cl_slow: {
    id: "cl_slow",
    label: "Weight Psalm",
    glyph: "Wp",
    unlockLevel: 18,
    mp: 18,
    recastMs: 20_000,
    category: "enfeeble",
    durationMs: 30_000,
    range: 12,
    needsTarget: true,
  },
  cl_paralyze: {
    id: "cl_paralyze",
    label: "Still Psalm",
    glyph: "Sp",
    unlockLevel: 32,
    mp: 26,
    recastMs: 25_000,
    category: "enfeeble",
    durationMs: 30_000,
    range: 12,
    needsTarget: true,
  },
  cl_silence: {
    id: "cl_silence",
    label: "Mute Psalm",
    glyph: "Mp",
    unlockLevel: 38,
    mp: 30,
    recastMs: 25_000,
    category: "enfeeble",
    durationMs: 30_000,
    range: 12,
    needsTarget: true,
  },
  cl_flash: {
    id: "cl_flash",
    label: "Sky Flare",
    glyph: "Sf",
    unlockLevel: 45,
    mp: 22,
    recastMs: 45_000,
    category: "enfeeble",
    durationMs: 12_000,
    aoe: 8,
  },
};

export const CLERIC_ABILITY_BLURBS: Record<ClericAbilityId, string> = {
  rest: "Kneel to recover HP and MP. Breaks on damage or move.",
  sacred_mercy:
    "2-hour mercy — party full HP and most ailments scrubbed in a column of light.",
  divine_seal: "Next Ashmend or Daybreak Ray heals or smites at double strength.",
  solace_rite: "Toggle: your cures also grant a short absorb shield.",
  martyr: "Offer your blood — sacrifice HP to mend an ally.",
  misery_rite: "Toggle: enfeebles bite harder after you take damage.",
  devotion: "Convert your vitality into MP for an ally.",
  asylum: "Party magic damage taken −30% for a short time.",
  cl_cure: "Primary single-target mend — stronger than palace chrona cures.",
  cl_cure_ii: "Stronger Ashmend.",
  cl_cure_iii: "Major Ashmend.",
  cl_cure_iv: "Grand Ashmend.",
  cl_cure_v: "Peak Ashmend — best single-target mend in Bellgrave.",
  cl_curaga: "Radiant well — heal allies nearby.",
  cl_curaga_ii: "Greater Ashwell.",
  cl_curaga_iii: "Supreme Ashwell.",
  cl_poisona: "Scrub poison from an ally.",
  cl_paralyna: "Free an ally from paralysis.",
  cl_blindna: "Restore sight.",
  cl_silena: "Restore voice.",
  cl_viruna: "Break disease.",
  cl_stona: "Shatter petrification.",
  cl_cursna: "Lift a hex.",
  cl_erase: "Strip detrimental effects from an ally.",
  cl_raise: "Recall fallen ally with rising light.",
  cl_raise_ii: "Stronger recall — more HP on return.",
  cl_reraise: "Ember vigil — ally auto-recalls once if they fall.",
  cl_regen: "Gentle pulse of renewal over time.",
  cl_regen_ii: "Stronger pulse.",
  cl_regen_iii: "Supreme pulse.",
  cl_protect: "Sky ward — soften physical blows.",
  cl_protect_ii: "Improved sky ward.",
  cl_protect_iii: "Superior sky ward.",
  cl_protectra: "Mass sky ward for the party.",
  cl_shell: "Bell aegis — soften magic blows.",
  cl_shell_ii: "Improved bell aegis.",
  cl_shell_iii: "Superior bell aegis.",
  cl_shellra: "Mass bell aegis for the party.",
  cl_haste: "Sunstride — mild magical haste on an ally.",
  cl_banish: "Daybreak ray — divine smite vs unholy.",
  cl_banish_ii: "Heavy daybreak ray.",
  cl_holy: "Bell judgment — devastating holy burst.",
  cl_slow: "Weight psalm — slow enemy swings.",
  cl_paralyze: "Still psalm — seize the foe.",
  cl_silence: "Mute psalm — silence the foe.",
  cl_flash: "Sky flare — blind nearby foes.",
};

export const CLERIC_CATEGORY_TABS: { id: ClericAbilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ja", label: "Job" },
  { id: "heal", label: "Heal" },
  { id: "na", label: "Status" },
  { id: "raise", label: "Recall" },
  { id: "regen", label: "Regen" },
  { id: "enhance", label: "Enhance" },
  { id: "divine", label: "Divine" },
  { id: "enfeeble", label: "Enfeeble" },
  { id: "utility", label: "Utility" },
];

export function isClericAbilityId(id: string): id is ClericAbilityId {
  return Object.prototype.hasOwnProperty.call(CLERIC_ABILITIES, id);
}

export function clericAbilitiesUnlocked(level: number): ClericAbilityId[] {
  return CLERIC_ABILITY_IDS.filter((id) => CLERIC_ABILITIES[id].unlockLevel <= level);
}

export function clericHotbarOrder(unlocked: readonly ClericAbilityId[]): ClericAbilityId[] {
  const prefer: ClericAbilityId[] = [
    "cl_cure",
    "cl_curaga",
    "cl_regen",
    "cl_protect",
    "cl_shell",
    "cl_raise",
    "cl_poisona",
    "cl_erase",
    "divine_seal",
    "sacred_mercy",
    "cl_haste",
    "cl_banish",
    "cl_holy",
    "cl_flash",
    "solace_rite",
    "martyr",
    "asylum",
  ];
  const set = new Set(unlocked);
  const out: ClericAbilityId[] = [];
  for (const id of prefer) {
    if (set.has(id) && id !== "rest") out.push(id);
  }
  for (const id of unlocked) {
    if (id === "rest") continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function clericAbilityTooltip(id: ClericAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const def = CLERIC_ABILITIES[id];
  const blurb = CLERIC_ABILITY_BLURBS[id];
  const bits: string[] = [`Lv ${def.unlockLevel}`];
  if (def.mp > 0) bits.push(`MP ${def.mp}`);
  else if (def.category === "ja") bits.push("No MP");
  if (def.recastMs > 0) {
    const s = def.recastMs / 1000;
    bits.push(s >= 3600 ? `CD ${Math.round(s / 3600)}h` : s >= 60 ? `CD ${Math.round(s / 60)}m` : `CD ${s}s`);
  }
  if (def.durationMs) bits.push(`Dur ${def.durationMs / 1000}s`);
  if (def.heal) bits.push(`Heal ~${def.heal}`);
  if (def.regenTick) bits.push(`Regen ${def.regenTick}/3s`);
  if (def.potency) bits.push(`Potency ${def.potency}`);
  if (def.physDt != null && def.physDt < 1) {
    bits.push(`Phys DT −${Math.round((1 - def.physDt) * 100)}%`);
  }
  if (def.magDt != null && def.magDt < 1) {
    bits.push(`Magic DT −${Math.round((1 - def.magDt) * 100)}%`);
  }
  if (def.haste) bits.push(`Haste +${Math.round(def.haste * 100)}%`);
  if (def.aoe) bits.push(`AoE ${def.aoe}m`);
  if (def.needsTarget) bits.push("Enemy target");
  if (def.allyTarget) bits.push("Ally target");
  if (def.toggle) bits.push("Toggle");
  if (def.staffRequired) bits.push("Staff");
  return { title: def.label, body: blurb, meta: bits.join(" · ") };
}

export function clericAbilityIconUrl(id: ClericAbilityId | string): string {
  const shared = SHARED_ABILITY_ICON[id];
  if (shared) return shared;
  if (isClericAbilityId(id) && CLERIC_ABILITIES[id].icon) return CLERIC_ABILITIES[id].icon!;
  return `/icons/abilities/${id}.png`;
}

/**
 * Sorcerer kit — elemental nuker (jobs-from-plan §4.4).
 * Feel: squishy backline; violet/blue cast windows; per-element nuke colors.
 * Original Bellgrave spell names — not trademark tier labels.
 */

import { SHARED_ABILITY_ICON } from "./shared-icons";
import { isTrainerFreeAbility } from "./trainer";

export const SORCERER_ABILITY_IDS = [
  "rest",
  // job abilities
  "arcane_flood",
  "elemental_seal",
  "mana_wall",
  "manawell",
  "enmity_douse",
  "cascade",
  "focal_neve",
  // fire
  "sc_ember_lance",
  "sc_ember_lance_ii",
  "sc_ember_lance_iii",
  "sc_ember_lance_iv",
  "sc_ember_rain",
  "sc_ember_rain_ii",
  "sc_ember_rain_iii",
  "sc_ember_nova",
  // stone
  "sc_gravel_shard",
  "sc_gravel_shard_ii",
  "sc_gravel_shard_iii",
  "sc_gravel_shard_iv",
  "sc_gravel_storm",
  "sc_gravel_storm_ii",
  "sc_gravel_storm_iii",
  "sc_gravel_cataclysm",
  // water
  "sc_tidebreak",
  "sc_tidebreak_ii",
  "sc_tidebreak_iii",
  "sc_tidebreak_iv",
  "sc_tide_surge",
  "sc_tide_surge_ii",
  "sc_tide_surge_iii",
  "sc_tide_maelstrom",
  // wind
  "sc_gale_cut",
  "sc_gale_cut_ii",
  "sc_gale_cut_iii",
  "sc_gale_cut_iv",
  "sc_gale_front",
  "sc_gale_front_ii",
  "sc_gale_front_iii",
  "sc_gale_maelstrom",
  // ice
  "sc_rime_needle",
  "sc_rime_needle_ii",
  "sc_rime_needle_iii",
  "sc_rime_needle_iv",
  "sc_rime_squall",
  "sc_rime_squall_ii",
  "sc_rime_squall_iii",
  "sc_rime_cataclysm",
  // lightning
  "sc_volt_arc",
  "sc_volt_arc_ii",
  "sc_volt_arc_iii",
  "sc_volt_arc_iv",
  "sc_volt_chain",
  "sc_volt_chain_ii",
  "sc_volt_chain_iii",
  "sc_volt_nova",
  // enfeebling / dark / utility
  "sc_morrow_sleep",
  "sc_morrow_slumber",
  "sc_mist_blind",
  "sc_root_sigil",
  "sc_unweave",
  "sc_life_leech",
  "sc_mana_siphon",
  "sc_gloom_stun",
  "sc_phase_warp",
  "sc_ash_escape",
] as const;

export type SorcererAbilityId = (typeof SORCERER_ABILITY_IDS)[number];

export type SorcererElement = "fire" | "stone" | "water" | "wind" | "ice" | "lightning" | "dark";

export type SorcererAbilityCategory =
  | "utility"
  | "ja"
  | "elemental"
  | "enfeeble"
  | "dark"
  | "travel";

export type SorcererAbilityDef = {
  id: SorcererAbilityId;
  label: string;
  glyph: string;
  icon?: string;
  unlockLevel: number;
  mp: number;
  recastMs: number;
  category: SorcererAbilityCategory;
  element?: SorcererElement;
  /** Single-target nuke potency baseline. */
  potency?: number;
  durationMs?: number;
  range?: number;
  aoe?: number;
  needsTarget?: boolean;
  staffRequired?: boolean;
  /** AoE nuke flag for resolver routing. */
  isGa?: boolean;
};

function nukeRow(
  id: SorcererAbilityId,
  label: string,
  glyph: string,
  unlockLevel: number,
  mp: number,
  element: SorcererElement,
  potency: number,
  opts?: { aoe?: number; isGa?: boolean; range?: number },
): SorcererAbilityDef {
  return {
    id,
    label,
    glyph,
    unlockLevel,
    mp,
    recastMs: 0,
    category: "elemental",
    element,
    potency,
    needsTarget: true,
    staffRequired: true,
    range: opts?.range ?? 12,
    aoe: opts?.aoe,
    isGa: opts?.isGa,
  };
}

export const SORCERER_ABILITIES: Record<SorcererAbilityId, SorcererAbilityDef> = {
  rest: {
    id: "rest",
    label: "Rest",
    glyph: "Rs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 0,
    category: "utility",
  },
  arcane_flood: {
    id: "arcane_flood",
    label: "Arcane Flood",
    glyph: "Af",
    unlockLevel: 1,
    mp: 0,
    recastMs: 2 * 60 * 60 * 1000,
    category: "ja",
    durationMs: 60_000,
    staffRequired: true,
  },
  elemental_seal: {
    id: "elemental_seal",
    label: "Elemental Seal",
    glyph: "Es",
    unlockLevel: 15,
    mp: 0,
    recastMs: 10 * 60_000,
    category: "ja",
    durationMs: 60_000,
    staffRequired: true,
  },
  mana_wall: {
    id: "mana_wall",
    label: "Mana Wall",
    glyph: "Mw",
    unlockLevel: 30,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    durationMs: 60_000,
    staffRequired: true,
  },
  manawell: {
    id: "manawell",
    label: "Manawell",
    glyph: "Mw",
    unlockLevel: 40,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    staffRequired: true,
  },
  enmity_douse: {
    id: "enmity_douse",
    label: "Enmity Douse",
    glyph: "Ed",
    unlockLevel: 50,
    mp: 0,
    recastMs: 3 * 60_000,
    category: "ja",
    staffRequired: true,
  },
  cascade: {
    id: "cascade",
    label: "Cascade",
    glyph: "Ca",
    unlockLevel: 60,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    durationMs: 30_000,
    staffRequired: true,
  },
  focal_neve: {
    id: "focal_neve",
    label: "Focal Neve",
    glyph: "Fn",
    unlockLevel: 75,
    mp: 0,
    recastMs: 20 * 60_000,
    category: "ja",
    durationMs: 60_000,
    staffRequired: true,
  },

  sc_ember_lance: nukeRow("sc_ember_lance", "Ember Lance", "E1", 13, 18, "fire", 55),
  sc_ember_lance_ii: nukeRow("sc_ember_lance_ii", "Ember Lance II", "E2", 38, 38, "fire", 120),
  sc_ember_lance_iii: nukeRow("sc_ember_lance_iii", "Ember Lance III", "E3", 62, 62, "fire", 210),
  sc_ember_lance_iv: nukeRow("sc_ember_lance_iv", "Ember Lance IV", "E4", 73, 88, "fire", 320),
  sc_ember_rain: nukeRow("sc_ember_rain", "Ember Rain", "Er", 28, 28, "fire", 85, { aoe: 8, isGa: true }),
  sc_ember_rain_ii: nukeRow("sc_ember_rain_ii", "Ember Rain II", "R2", 53, 53, "fire", 165, { aoe: 8, isGa: true }),
  sc_ember_rain_iii: nukeRow("sc_ember_rain_iii", "Ember Rain III", "R3", 69, 69, "fire", 240, { aoe: 9, isGa: true }),
  sc_ember_nova: nukeRow("sc_ember_nova", "Ember Nova", "En", 75, 118, "fire", 380, { aoe: 10, isGa: true }),

  sc_gravel_shard: nukeRow("sc_gravel_shard", "Gravel Shard", "G1", 4, 12, "stone", 45),
  sc_gravel_shard_ii: nukeRow("sc_gravel_shard_ii", "Gravel Shard II", "G2", 21, 26, "stone", 95),
  sc_gravel_shard_iii: nukeRow("sc_gravel_shard_iii", "Gravel Shard III", "G3", 46, 46, "stone", 175),
  sc_gravel_shard_iv: nukeRow("sc_gravel_shard_iv", "Gravel Shard IV", "G4", 61, 72, "stone", 265),
  sc_gravel_storm: nukeRow("sc_gravel_storm", "Gravel Storm", "Gs", 24, 24, "stone", 70, { aoe: 8, isGa: true }),
  sc_gravel_storm_ii: nukeRow("sc_gravel_storm_ii", "Gravel Storm II", "S2", 48, 48, "stone", 140, { aoe: 8, isGa: true }),
  sc_gravel_storm_iii: nukeRow("sc_gravel_storm_iii", "Gravel Storm III", "S3", 65, 65, "stone", 215, { aoe: 9, isGa: true }),
  sc_gravel_cataclysm: nukeRow("sc_gravel_cataclysm", "Gravel Cataclysm", "Gc", 75, 110, "stone", 350, { aoe: 10, isGa: true }),

  sc_tidebreak: nukeRow("sc_tidebreak", "Tidebreak", "T1", 8, 14, "water", 50),
  sc_tidebreak_ii: nukeRow("sc_tidebreak_ii", "Tidebreak II", "T2", 30, 30, "water", 110),
  sc_tidebreak_iii: nukeRow("sc_tidebreak_iii", "Tidebreak III", "T3", 56, 56, "water", 195),
  sc_tidebreak_iv: nukeRow("sc_tidebreak_iv", "Tidebreak IV", "T4", 68, 82, "water", 300),
  sc_tide_surge: nukeRow("sc_tide_surge", "Tide Surge", "Ts", 26, 26, "water", 80, { aoe: 8, isGa: true }),
  sc_tide_surge_ii: nukeRow("sc_tide_surge_ii", "Tide Surge II", "U2", 50, 50, "water", 155, { aoe: 8, isGa: true }),
  sc_tide_surge_iii: nukeRow("sc_tide_surge_iii", "Tide Surge III", "U3", 67, 67, "water", 230, { aoe: 9, isGa: true }),
  sc_tide_maelstrom: nukeRow("sc_tide_maelstrom", "Tide Maelstrom", "Tm", 75, 115, "water", 365, { aoe: 10, isGa: true }),

  sc_gale_cut: nukeRow("sc_gale_cut", "Gale Cut", "W1", 10, 16, "wind", 52),
  sc_gale_cut_ii: nukeRow("sc_gale_cut_ii", "Gale Cut II", "W2", 34, 34, "wind", 115),
  sc_gale_cut_iii: nukeRow("sc_gale_cut_iii", "Gale Cut III", "W3", 58, 58, "wind", 200),
  sc_gale_cut_iv: nukeRow("sc_gale_cut_iv", "Gale Cut IV", "W4", 71, 85, "wind", 310),
  sc_gale_front: nukeRow("sc_gale_front", "Gale Front", "Gf", 27, 27, "wind", 82, { aoe: 8, isGa: true }),
  sc_gale_front_ii: nukeRow("sc_gale_front_ii", "Gale Front II", "F2", 51, 51, "wind", 158, { aoe: 8, isGa: true }),
  sc_gale_front_iii: nukeRow("sc_gale_front_iii", "Gale Front III", "F3", 68, 68, "wind", 235, { aoe: 9, isGa: true }),
  sc_gale_maelstrom: nukeRow("sc_gale_maelstrom", "Gale Maelstrom", "Gm", 75, 112, "wind", 360, { aoe: 10, isGa: true }),

  sc_rime_needle: nukeRow("sc_rime_needle", "Rime Needle", "I1", 16, 20, "ice", 58),
  sc_rime_needle_ii: nukeRow("sc_rime_needle_ii", "Rime Needle II", "I2", 40, 40, "ice", 125),
  sc_rime_needle_iii: nukeRow("sc_rime_needle_iii", "Rime Needle III", "I3", 64, 64, "ice", 215),
  sc_rime_needle_iv: nukeRow("sc_rime_needle_iv", "Rime Needle IV", "I4", 74, 90, "ice", 325),
  sc_rime_squall: nukeRow("sc_rime_squall", "Rime Squall", "Rq", 29, 29, "ice", 88, { aoe: 8, isGa: true }),
  sc_rime_squall_ii: nukeRow("sc_rime_squall_ii", "Rime Squall II", "Q2", 54, 54, "ice", 168, { aoe: 8, isGa: true }),
  sc_rime_squall_iii: nukeRow("sc_rime_squall_iii", "Rime Squall III", "Q3", 70, 70, "ice", 245, { aoe: 9, isGa: true }),
  sc_rime_cataclysm: nukeRow("sc_rime_cataclysm", "Rime Cataclysm", "Rc", 75, 120, "ice", 385, { aoe: 10, isGa: true }),

  sc_volt_arc: nukeRow("sc_volt_arc", "Volt Arc", "V1", 19, 22, "lightning", 62),
  sc_volt_arc_ii: nukeRow("sc_volt_arc_ii", "Volt Arc II", "V2", 42, 42, "lightning", 130),
  sc_volt_arc_iii: nukeRow("sc_volt_arc_iii", "Volt Arc III", "V3", 66, 66, "lightning", 220),
  sc_volt_arc_iv: nukeRow("sc_volt_arc_iv", "Volt Arc IV", "V4", 75, 92, "lightning", 330),
  sc_volt_chain: nukeRow("sc_volt_chain", "Volt Chain", "Vc", 31, 31, "lightning", 92, { aoe: 8, isGa: true }),
  sc_volt_chain_ii: nukeRow("sc_volt_chain_ii", "Volt Chain II", "C2", 55, 55, "lightning", 172, { aoe: 8, isGa: true }),
  sc_volt_chain_iii: nukeRow("sc_volt_chain_iii", "Volt Chain III", "C3", 72, 72, "lightning", 250, { aoe: 9, isGa: true }),
  sc_volt_nova: nukeRow("sc_volt_nova", "Volt Nova", "Vn", 75, 125, "lightning", 390, { aoe: 10, isGa: true }),

  sc_morrow_sleep: {
    id: "sc_morrow_sleep",
    label: "Morrow Sleep",
    glyph: "Ms",
    unlockLevel: 20,
    mp: 15,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 45_000,
    range: 12,
    needsTarget: true,
    staffRequired: true,
  },
  sc_morrow_slumber: {
    id: "sc_morrow_slumber",
    label: "Morrow Slumber",
    glyph: "Ml",
    unlockLevel: 35,
    mp: 38,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 30_000,
    aoe: 8,
    range: 12,
    needsTarget: true,
    staffRequired: true,
  },
  sc_mist_blind: {
    id: "sc_mist_blind",
    label: "Mist Blind",
    glyph: "Mb",
    unlockLevel: 18,
    mp: 12,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 90_000,
    range: 12,
    needsTarget: true,
    staffRequired: true,
  },
  sc_root_sigil: {
    id: "sc_root_sigil",
    label: "Root Sigil",
    glyph: "Rs",
    unlockLevel: 11,
    mp: 14,
    recastMs: 0,
    category: "enfeeble",
    durationMs: 60_000,
    range: 12,
    needsTarget: true,
    staffRequired: true,
  },
  sc_unweave: {
    id: "sc_unweave",
    label: "Unweave",
    glyph: "Uw",
    unlockLevel: 32,
    mp: 18,
    recastMs: 0,
    category: "enfeeble",
    range: 12,
    needsTarget: true,
    staffRequired: true,
  },
  sc_life_leech: {
    id: "sc_life_leech",
    label: "Life Leech",
    glyph: "Ll",
    unlockLevel: 36,
    mp: 28,
    recastMs: 0,
    category: "dark",
    potency: 45,
    range: 8,
    needsTarget: true,
    staffRequired: true,
  },
  sc_mana_siphon: {
    id: "sc_mana_siphon",
    label: "Mana Siphon",
    glyph: "Sp",
    unlockLevel: 25,
    mp: 0,
    recastMs: 0,
    category: "dark",
    range: 8,
    needsTarget: true,
    staffRequired: true,
  },
  sc_gloom_stun: {
    id: "sc_gloom_stun",
    label: "Gloom Stun",
    glyph: "Gs",
    unlockLevel: 45,
    mp: 42,
    recastMs: 15_000,
    category: "dark",
    durationMs: 5_000,
    range: 8,
    needsTarget: true,
    staffRequired: true,
  },
  sc_phase_warp: {
    id: "sc_phase_warp",
    label: "Phase Warp",
    glyph: "Pw",
    unlockLevel: 50,
    mp: 80,
    recastMs: 10 * 60_000,
    category: "travel",
  },
  sc_ash_escape: {
    id: "sc_ash_escape",
    label: "Ash Escape",
    glyph: "Ae",
    unlockLevel: 22,
    mp: 24,
    recastMs: 60_000,
    category: "travel",
  },
};

export const SORCERER_ABILITY_BLURBS: Record<SorcererAbilityId, string> = {
  rest: "Kneel to recover HP and MP. Breaks on damage or move.",
  arcane_flood: "2-hour: 60s of casting without MP cost; your spells cannot be interrupted.",
  elemental_seal: "Next elemental spell lands with crushing accuracy and power.",
  mana_wall: "Your HP absorbs incoming magic while your mana bleeds instead.",
  manawell: "The next spell you cast costs no MP.",
  enmity_douse: "Wash away your enmity — foes forget you.",
  cascade: "Prime a burst — your next nuke hits harder in a chain window.",
  focal_neve: "Focus the neve — huge INT and magic attack for 60s.",
  sc_ember_lance: "Single-target fire lance.",
  sc_ember_lance_ii: "Stronger ember lance.",
  sc_ember_lance_iii: "Heavy ember lance.",
  sc_ember_lance_iv: "Peak ember lance.",
  sc_ember_rain: "Fire rain on nearby foes.",
  sc_ember_rain_ii: "Heavier ember rain.",
  sc_ember_rain_iii: "Inferno rain.",
  sc_ember_nova: "Ultimate ember detonation.",
  sc_gravel_shard: "Stone shard strike.",
  sc_gravel_shard_ii: "Heavier gravel shard.",
  sc_gravel_shard_iii: "Major gravel shard.",
  sc_gravel_shard_iv: "Peak gravel shard.",
  sc_gravel_storm: "Stone storm AoE.",
  sc_gravel_storm_ii: "Heavier gravel storm.",
  sc_gravel_storm_iii: "Earth tempest.",
  sc_gravel_cataclysm: "Ultimate gravel cataclysm.",
  sc_tidebreak: "Water bolt.",
  sc_tidebreak_ii: "Stronger tidebreak.",
  sc_tidebreak_iii: "Major tidebreak.",
  sc_tidebreak_iv: "Peak tidebreak.",
  sc_tide_surge: "Water surge AoE.",
  sc_tide_surge_ii: "Heavier tide surge.",
  sc_tide_surge_iii: "Raging surge.",
  sc_tide_maelstrom: "Ultimate tide maelstrom.",
  sc_gale_cut: "Wind cut.",
  sc_gale_cut_ii: "Stronger gale cut.",
  sc_gale_cut_iii: "Major gale cut.",
  sc_gale_cut_iv: "Peak gale cut.",
  sc_gale_front: "Gale front AoE.",
  sc_gale_front_ii: "Heavier gale front.",
  sc_gale_front_iii: "Cutting wind wall.",
  sc_gale_maelstrom: "Ultimate gale maelstrom.",
  sc_rime_needle: "Ice needle.",
  sc_rime_needle_ii: "Stronger rime needle.",
  sc_rime_needle_iii: "Major rime needle.",
  sc_rime_needle_iv: "Peak rime needle.",
  sc_rime_squall: "Ice squall AoE.",
  sc_rime_squall_ii: "Heavier rime squall.",
  sc_rime_squall_iii: "Blizzard squall.",
  sc_rime_cataclysm: "Ultimate rime cataclysm.",
  sc_volt_arc: "Lightning arc.",
  sc_volt_arc_ii: "Stronger volt arc.",
  sc_volt_arc_iii: "Major volt arc.",
  sc_volt_arc_iv: "Peak volt arc.",
  sc_volt_chain: "Lightning chain AoE.",
  sc_volt_chain_ii: "Heavier volt chain.",
  sc_volt_chain_iii: "Storm chain.",
  sc_volt_nova: "Ultimate volt nova.",
  sc_morrow_sleep: "Put the foe to sleep.",
  sc_morrow_slumber: "Sleep magic in an area.",
  sc_mist_blind: "Blind the target.",
  sc_root_sigil: "Bind the foe in place.",
  sc_unweave: "Strip magical buffs.",
  sc_life_leech: "Drain HP from the target.",
  sc_mana_siphon: "Drain MP from the target.",
  sc_gloom_stun: "Dark stun — brief lockdown.",
  sc_phase_warp: "Long recast escape to the Pale Hollow encampment.",
  sc_ash_escape: "Quick escape back to the Pale Hollow encampment.",
};

export const SORCERER_CATEGORY_TABS: { id: SorcererAbilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ja", label: "Job" },
  { id: "elemental", label: "Elemental" },
  { id: "enfeeble", label: "Enfeeble" },
  { id: "dark", label: "Dark" },
  { id: "travel", label: "Travel" },
  { id: "utility", label: "Utility" },
];

export function isSorcererAbilityId(id: string): id is SorcererAbilityId {
  return Object.prototype.hasOwnProperty.call(SORCERER_ABILITIES, id);
}

export function isSorcererSpell(id: SorcererAbilityId): boolean {
  const cat = SORCERER_ABILITIES[id].category;
  return cat === "elemental" || cat === "enfeeble" || cat === "dark" || cat === "travel";
}

export function sorcererAbilitiesUnlocked(
  level: number,
  learned: readonly string[] = [],
): SorcererAbilityId[] {
  const learnedSet = new Set(learned);
  return SORCERER_ABILITY_IDS.filter((id) => {
    if (SORCERER_ABILITIES[id].unlockLevel > level) return false;
    if (isTrainerFreeAbility(id)) return true;
    return learnedSet.has(id);
  });
}

export function sorcererHotbarOrder(unlocked: readonly SorcererAbilityId[]): SorcererAbilityId[] {
  const prefer: SorcererAbilityId[] = [
    "elemental_seal",
    "arcane_flood",
    "focal_neve",
    "sc_ember_lance",
    "sc_gravel_shard",
    "sc_volt_arc",
    "sc_rime_needle",
    "sc_gale_cut",
    "sc_tidebreak",
    "manawell",
    "cascade",
    "enmity_douse",
    "sc_morrow_sleep",
    "sc_root_sigil",
    "sc_unweave",
    "sc_life_leech",
    "sc_gloom_stun",
  ];
  const set = new Set(unlocked);
  const out: SorcererAbilityId[] = [];
  for (const id of prefer) {
    if (set.has(id)) out.push(id);
  }
  for (const id of unlocked) {
    if (id === "rest") continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function sorcererAbilityTooltip(id: SorcererAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const def = SORCERER_ABILITIES[id];
  const blurb = SORCERER_ABILITY_BLURBS[id];
  const bits: string[] = [`Lv ${def.unlockLevel}`];
  if (def.mp > 0) bits.push(`MP ${def.mp}`);
  else if (def.category === "ja") bits.push("No MP");
  if (def.recastMs > 0) {
    const s = def.recastMs / 1000;
    bits.push(s >= 3600 ? `CD ${Math.round(s / 3600)}h` : s >= 60 ? `CD ${Math.round(s / 60)}m` : `CD ${s}s`);
  }
  if (def.durationMs) bits.push(`Dur ${def.durationMs / 1000}s`);
  if (def.potency) bits.push(`Potency ${def.potency}`);
  if (def.element) bits.push(def.element);
  if (def.needsTarget) bits.push("Target");
  if (def.aoe) bits.push(`AoE ${def.aoe}m`);
  if (def.staffRequired) bits.push("Staff (main)");
  return { title: def.label, body: blurb, meta: bits.join(" · ") };
}

export function sorcererAbilityIconUrl(id: SorcererAbilityId | string): string {
  const shared = SHARED_ABILITY_ICON[id];
  if (shared) return shared;
  if (isSorcererAbilityId(id) && SORCERER_ABILITIES[id].icon) return SORCERER_ABILITIES[id].icon!;
  return `/icons/abilities/${id}.png`;
}

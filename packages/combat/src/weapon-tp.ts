/**
 * Weapon Skill (TP) abilities — unlocked by character level, gated by equipped weapon type.
 * Cost 1000 TP. Damage core is physicalDamage * ftp (x hits); TP scales a multiplier on that
 * bonus portion only (not flat leftover+1000). Per-weapon combat skill levels are deferred (#106);
 * WS attack path uses skill-tree atk + equipped weapon atk like autos.
 */

import { WEAPON_TOKEN_TYPES } from "./weapon-tokens.generated";

export const WEAPON_TP_COST = 1000;
/** Soft cap used for TP->bonus mul (matches max TP pool). */
export const WEAPON_TP_BONUS_CAP = 3000;
/** Bonus mul at exactly WEAPON_TP_COST (min cast). */
export const WEAPON_TP_BONUS_MUL_MIN = 0.25;
/** Bonus mul at WEAPON_TP_BONUS_CAP. */
export const WEAPON_TP_BONUS_MUL_MAX = 1.0;

export const WEAPON_TP_UNLOCK_LEVELS = [1, 5, 10, 20, 30, 40, 60, 75] as const;
export type WeaponTpUnlockLevel = (typeof WEAPON_TP_UNLOCK_LEVELS)[number];

export const WEAPON_TYPES = [
  "sword",
  "greatsword",
  "dagger",
  "axe",
  "staff",
  "club",
  "knuckles",
] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export type WeaponTpEffect =
  | { kind: "stun"; durationMs: number }
  | { kind: "para"; durationMs: number }
  | { kind: "slow"; durationMs: number; penalty: number }
  | { kind: "atk_down"; durationMs: number; mul: number };

export type WeaponTpDef = {
  id: string;
  weapon: WeaponType;
  unlockLevel: WeaponTpUnlockLevel;
  label: string;
  glyph: string;
  hits: number;
  /** Multiplier on each hit's physical base before TP bonus mul. */
  ftp: number;
  effects?: WeaponTpEffect[];
  blurb: string;
  recastMs: number;
};

function def(
  id: string,
  weapon: WeaponType,
  unlockLevel: WeaponTpUnlockLevel,
  label: string,
  glyph: string,
  hits: number,
  ftp: number,
  blurb: string,
  effects?: WeaponTpEffect[],
  recastMs = 8000,
): WeaponTpDef {
  return { id, weapon, unlockLevel, label, glyph, hits, ftp, blurb, effects, recastMs };
}

/** 8 skills × 7 weapon families */
export const WEAPON_TP_ABILITIES = {
  // —— Sword ——
  ws_sword_fast_blade: def(
    "ws_sword_fast_blade",
    "sword",
    1,
    "Fast Blade",
    "切",
    1,
    1.0,
    "Single slash. TP boosts bonus dmg (not flat leftover).",
  ),
  ws_sword_flat_blade: def(
    "ws_sword_flat_blade",
    "sword",
    5,
    "Flat Blade",
    "平",
    1,
    1.15,
    "Pommel strike — stuns briefly.",
    [{ kind: "stun", durationMs: 2500 }],
  ),
  ws_sword_circle_blade: def(
    "ws_sword_circle_blade",
    "sword",
    10,
    "Circle Blade",
    "円",
    2,
    0.85,
    "Two-hit spinning cut.",
  ),
  ws_sword_vorpal_blade: def(
    "ws_sword_vorpal_blade",
    "sword",
    20,
    "Vorpal Blade",
    "穿",
    1,
    1.4,
    "Piercing thrust — Attack Down.",
    [{ kind: "atk_down", durationMs: 30_000, mul: 0.75 }],
  ),
  ws_sword_swift_blade: def(
    "ws_sword_swift_blade",
    "sword",
    30,
    "Swift Blade",
    "迅",
    3,
    0.75,
    "Three rapid cuts.",
  ),
  ws_sword_savage_blade: def(
    "ws_sword_savage_blade",
    "sword",
    40,
    "Savage Blade",
    "荒",
    1,
    1.65,
    "Heavy cleave — Slow.",
    [{ kind: "slow", durationMs: 25_000, penalty: 0.3 }],
  ),
  ws_sword_death_blossom: def(
    "ws_sword_death_blossom",
    "sword",
    60,
    "Death Blossom",
    "華",
    4,
    0.7,
    "Four-petal flurry.",
  ),
  ws_sword_knights_round: def(
    "ws_sword_knights_round",
    "sword",
    75,
    "Knights of Round",
    "円卓",
    5,
    0.65,
    "Five righteous strikes — stun on last.",
    [{ kind: "stun", durationMs: 3500 }],
    12_000,
  ),

  // —— Greatsword ——
  ws_gs_hard_slash: def("ws_gs_hard_slash", "greatsword", 1, "Hard Slash", "剛", 1, 1.1, "Crushing two-hander opener."),
  ws_gs_power_slash: def(
    "ws_gs_power_slash",
    "greatsword",
    5,
    "Power Slash",
    "豪",
    1,
    1.25,
    "Overhead smash — Attack Down.",
    [{ kind: "atk_down", durationMs: 28_000, mul: 0.7 }],
  ),
  ws_gs_sickle_moon: def("ws_gs_sickle_moon", "greatsword", 10, "Sickle Moon", "月", 2, 0.9, "Two crescent cuts."),
  ws_gs_spinning_slash: def(
    "ws_gs_spinning_slash",
    "greatsword",
    20,
    "Spinning Slash",
    "旋",
    1,
    1.5,
    "Full spin — Slow.",
    [{ kind: "slow", durationMs: 22_000, penalty: 0.28 }],
  ),
  ws_gs_ground_strike: def(
    "ws_gs_ground_strike",
    "greatsword",
    30,
    "Ground Strike",
    "地",
    1,
    1.55,
    "Quake slash — stun.",
    [{ kind: "stun", durationMs: 2800 }],
  ),
  ws_gs_scourge: def("ws_gs_scourge", "greatsword", 40, "Scourge", "災", 3, 0.8, "Three punishing strokes."),
  ws_gs_torcleaver: def(
    "ws_gs_torcleaver",
    "greatsword",
    60,
    "Torcleaver",
    "裂",
    1,
    1.9,
    "Armor-rending blow — Paralyze.",
    [{ kind: "para", durationMs: 20_000 }],
  ),
  ws_gs_resolution: def(
    "ws_gs_resolution",
    "greatsword",
    75,
    "Resolution",
    "決",
    4,
    0.72,
    "Four finishing blows — Attack Down.",
    [{ kind: "atk_down", durationMs: 35_000, mul: 0.65 }],
    12_000,
  ),

  // —— Dagger ——
  ws_dg_wasp_sting: def("ws_dg_wasp_sting", "dagger", 1, "Wasp Sting", "蜂", 1, 0.95, "Quick poison tip (single hit)."),
  ws_dg_gust_slash: def(
    "ws_dg_gust_slash",
    "dagger",
    5,
    "Gust Slash",
    "風",
    2,
    0.8,
    "Two wind-swift cuts.",
  ),
  ws_dg_shadowstitch: def(
    "ws_dg_shadowstitch",
    "dagger",
    10,
    "Shadowstitch",
    "縫",
    1,
    1.1,
    "Binding stitch — Paralyze.",
    [{ kind: "para", durationMs: 18_000 }],
  ),
  ws_dg_viper_bite: def(
    "ws_dg_viper_bite",
    "dagger",
    20,
    "Viper Bite",
    "蛇",
    1,
    1.35,
    "Venomed bite — Attack Down.",
    [{ kind: "atk_down", durationMs: 25_000, mul: 0.72 }],
  ),
  ws_dg_cyclone: def("ws_dg_cyclone", "dagger", 30, "Cyclone", "嵐", 3, 0.7, "Three whirling stabs."),
  ws_dg_energy_steal: def(
    "ws_dg_energy_steal",
    "dagger",
    40,
    "Energy Steal",
    "奪",
    1,
    1.45,
    "Draining cut — Slow.",
    [{ kind: "slow", durationMs: 20_000, penalty: 0.25 }],
  ),
  ws_dg_evisceration: def("ws_dg_evisceration", "dagger", 60, "Evisceration", "剔", 5, 0.55, "Five critical jabs."),
  ws_dg_rudras_storm: def(
    "ws_dg_rudras_storm",
    "dagger",
    75,
    "Rudra's Storm",
    "嵐神",
    4,
    0.7,
    "Storm of blades — stun.",
    [{ kind: "stun", durationMs: 3000 }],
    12_000,
  ),

  // —— Axe ——
  ws_axe_raging_axe: def("ws_axe_raging_axe", "axe", 1, "Raging Axe", "怒", 1, 1.05, "Brutal opener."),
  ws_axe_smash_axe: def(
    "ws_axe_smash_axe",
    "axe",
    5,
    "Smash Axe",
    "砕",
    1,
    1.2,
    "Skull smash — stun.",
    [{ kind: "stun", durationMs: 2600 }],
  ),
  ws_axe_gale_axe: def("ws_axe_gale_axe", "axe", 10, "Gale Axe", "颶", 2, 0.88, "Two wind-carried chops."),
  ws_axe_avalanche_axe: def(
    "ws_axe_avalanche_axe",
    "axe",
    20,
    "Avalanche Axe",
    "雪崩",
    1,
    1.45,
    "Crushing fall — Attack Down.",
    [{ kind: "atk_down", durationMs: 28_000, mul: 0.7 }],
  ),
  ws_axe_spinning_axe: def("ws_axe_spinning_axe", "axe", 30, "Spinning Axe", "回", 3, 0.78, "Three spinning bites."),
  ws_axe_rampage: def(
    "ws_axe_rampage",
    "axe",
    40,
    "Rampage",
    "暴走",
    4,
    0.65,
    "Four wild swings — Slow.",
    [{ kind: "slow", durationMs: 22_000, penalty: 0.28 }],
  ),
  ws_axe_calamity: def(
    "ws_axe_calamity",
    "axe",
    60,
    "Calamity",
    "厄",
    1,
    1.85,
    "Doom chop — Paralyze.",
    [{ kind: "para", durationMs: 18_000 }],
  ),
  ws_axe_cloudsplitter: def(
    "ws_axe_cloudsplitter",
    "axe",
    75,
    "Cloudsplitter",
    "裂雲",
    3,
    0.85,
    "Sky-rending triad — stun.",
    [{ kind: "stun", durationMs: 3200 }],
    12_000,
  ),

  // —— Staff ——
  ws_staff_heavy_swing: def("ws_staff_heavy_swing", "staff", 1, "Heavy Swing", "重", 1, 1.0, "Staff bash."),
  ws_staff_rock_crusher: def(
    "ws_staff_rock_crusher",
    "staff",
    5,
    "Rock Crusher",
    "岩",
    1,
    1.2,
    "Earthen crack — Slow.",
    [{ kind: "slow", durationMs: 20_000, penalty: 0.25 }],
  ),
  ws_staff_earth_crusher: def("ws_staff_earth_crusher", "staff", 10, "Earth Crusher", "地砕", 2, 0.85, "Two seismic hits."),
  ws_staff_starburst: def(
    "ws_staff_starburst",
    "staff",
    20,
    "Starburst",
    "星",
    1,
    1.4,
    "Astral burst — Attack Down.",
    [{ kind: "atk_down", durationMs: 26_000, mul: 0.75 }],
  ),
  ws_staff_sunburst: def("ws_staff_sunburst", "staff", 30, "Sunburst", "日", 3, 0.75, "Three radiant strikes."),
  ws_staff_cataclysm: def(
    "ws_staff_cataclysm",
    "staff",
    40,
    "Cataclysm",
    "劫",
    1,
    1.6,
    "World-quake — stun.",
    [{ kind: "stun", durationMs: 2800 }],
  ),
  ws_staff_shattersoul: def(
    "ws_staff_shattersoul",
    "staff",
    60,
    "Shattersoul",
    "魂砕",
    4,
    0.68,
    "Four soul-rending blows — Paralyze.",
    [{ kind: "para", durationMs: 16_000 }],
  ),
  ws_staff_omniscience: def(
    "ws_staff_omniscience",
    "staff",
    75,
    "Omniscience",
    "全知",
    5,
    0.6,
    "Five chronal strikes — Slow + Attack Down.",
    [
      { kind: "slow", durationMs: 25_000, penalty: 0.3 },
      { kind: "atk_down", durationMs: 30_000, mul: 0.7 },
    ],
    12_000,
  ),

  // —— Club ——
  ws_club_shiny_strike: def("ws_club_shiny_strike", "club", 1, "Shiny Strike", "輝", 1, 1.0, "Bright club tap."),
  ws_club_brainshaker: def(
    "ws_club_brainshaker",
    "club",
    5,
    "Brainshaker",
    "震",
    1,
    1.15,
    "Skull rattle — stun.",
    [{ kind: "stun", durationMs: 2700 }],
  ),
  ws_club_starlight: def("ws_club_starlight", "club", 10, "Starlight", "星光", 2, 0.82, "Two luminous smacks."),
  ws_club_moonlight: def(
    "ws_club_moonlight",
    "club",
    20,
    "Moonlight",
    "月光",
    1,
    1.35,
    "Lunar crush — Attack Down.",
    [{ kind: "atk_down", durationMs: 27_000, mul: 0.73 }],
  ),
  ws_club_skullbreaker: def(
    "ws_club_skullbreaker",
    "club",
    30,
    "Skullbreaker",
    "砕骨",
    1,
    1.5,
    "Concussive blow — Paralyze.",
    [{ kind: "para", durationMs: 17_000 }],
  ),
  ws_club_true_strike: def("ws_club_true_strike", "club", 40, "True Strike", "真", 3, 0.78, "Three true hits."),
  ws_club_judgment: def(
    "ws_club_judgment",
    "club",
    60,
    "Judgment",
    "裁き",
    1,
    1.8,
    "Verdict — Slow.",
    [{ kind: "slow", durationMs: 24_000, penalty: 0.3 }],
  ),
  ws_club_black_halo: def(
    "ws_club_black_halo",
    "club",
    75,
    "Black Halo",
    "黒暈",
    4,
    0.7,
    "Four dark rings — stun.",
    [{ kind: "stun", durationMs: 3400 }],
    12_000,
  ),

  // —— Knuckles ——
  ws_kn_combo: def("ws_kn_combo", "knuckles", 1, "Combo", "連", 2, 0.7, "Two-hit opener."),
  ws_kn_shoulder_tackle: def(
    "ws_kn_shoulder_tackle",
    "knuckles",
    5,
    "Shoulder Tackle",
    "肩",
    1,
    1.15,
    "Body check — stun.",
    [{ kind: "stun", durationMs: 2400 }],
  ),
  ws_kn_one_inch_punch: def("ws_kn_one_inch_punch", "knuckles", 10, "One Inch Punch", "寸", 1, 1.3, "Point-blank strike."),
  ws_kn_backhand_blow: def(
    "ws_kn_backhand_blow",
    "knuckles",
    20,
    "Backhand Blow",
    "裏",
    2,
    0.9,
    "Two backhands — Attack Down.",
    [{ kind: "atk_down", durationMs: 24_000, mul: 0.74 }],
  ),
  ws_kn_raging_fists: def("ws_kn_raging_fists", "knuckles", 30, "Raging Fists", "怒拳", 4, 0.6, "Four raging punches."),
  ws_kn_asuran_fists: def(
    "ws_kn_asuran_fists",
    "knuckles",
    40,
    "Asuran Fists",
    "修羅",
    5,
    0.55,
    "Five asura blows — Slow.",
    [{ kind: "slow", durationMs: 20_000, penalty: 0.25 }],
  ),
  ws_kn_dragon_kick: def(
    "ws_kn_dragon_kick",
    "knuckles",
    60,
    "Dragon Kick",
    "龍",
    1,
    1.85,
    "Rising kick — Paralyze.",
    [{ kind: "para", durationMs: 15_000 }],
  ),
  ws_kn_victory_smite: def(
    "ws_kn_victory_smite",
    "knuckles",
    75,
    "Victory Smite",
    "勝",
    4,
    0.72,
    "Victory barrage — stun.",
    [{ kind: "stun", durationMs: 3200 }],
    12_000,
  ),
} as const satisfies Record<string, WeaponTpDef>;

export const WEAPON_TP_ABILITY_IDS = Object.keys(WEAPON_TP_ABILITIES) as [
  WeaponTpAbilityId,
  ...WeaponTpAbilityId[],
];

export type WeaponTpAbilityId = keyof typeof WEAPON_TP_ABILITIES;

export function isWeaponTpAbilityId(id: string): id is WeaponTpAbilityId {
  return Object.prototype.hasOwnProperty.call(WEAPON_TP_ABILITIES, id);
}

export const WEAPON_TP_CATEGORY_TAB = { id: "weapon", label: "Weapon Skills" } as const;

/** MVP fallback if generated map misses a starter id. */
const TOKEN_WEAPON_FALLBACK: Record<number, WeaponType> = {
  1: "staff",
  4: "sword",
  6: "dagger",
  8: "greatsword",
};

export function weaponTypeFromTokenId(tokenId: number | null | undefined): WeaponType | null {
  if (tokenId == null) return null;
  return WEAPON_TOKEN_TYPES[tokenId] ?? TOKEN_WEAPON_FALLBACK[tokenId] ?? null;
}

export function weaponTpUnlocked(
  weapon: WeaponType | null | undefined,
  level: number,
): WeaponTpAbilityId[] {
  if (!weapon) return [];
  const lv = Math.max(1, Math.floor(level));
  return WEAPON_TP_ABILITY_IDS.filter((id) => {
    const d = WEAPON_TP_ABILITIES[id]!;
    return d.weapon === weapon && d.unlockLevel <= lv;
  }) as WeaponTpAbilityId[];
}

export function weaponTpAbilityIconUrl(id: WeaponTpAbilityId): string {
  return `/icons/abilities/${id}.png`;
}

export function weaponTpAbilityTooltip(id: WeaponTpAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const d = WEAPON_TP_ABILITIES[id]!;
  const fx =
    d.effects?.map((e) => e.kind.replace("_", " ")).join(", ") || "damage";
  return {
    title: d.label,
    body: d.blurb,
    meta: (() => {
      const mulMinPct = Math.round(WEAPON_TP_BONUS_MUL_MIN * 100);
      const mulMaxPct = Math.round(WEAPON_TP_BONUS_MUL_MAX * 100);
      return `Weapon Skill · ${d.weapon} · Lv${d.unlockLevel} · ${d.hits} hit${d.hits > 1 ? "s" : ""} · ${fx} · Cost ${WEAPON_TP_COST} TP · TP bonus +${mulMinPct}%–+${mulMaxPct}% of hit (${WEAPON_TP_COST}–${WEAPON_TP_BONUS_CAP} TP)`;
    })(),
  };
}

/**
 * TP -> bonus multiplier on each hit's (physicalDamage * ftp) portion.
 * Uses TP **before** paying the skill cost. Cost remains WEAPON_TP_COST.
 * Linear: WEAPON_TP_BONUS_MUL_MIN @ 1000 TP -> WEAPON_TP_BONUS_MUL_MAX @ 3000 TP.
 *
 * Replaces flat leftover+1000 so TP boosts bonuses without dominating base damage.
 */
export function weaponTpBonusMul(tpBeforeSpend: number): number {
  const tp = Math.max(
    WEAPON_TP_COST,
    Math.min(WEAPON_TP_BONUS_CAP, Math.floor(tpBeforeSpend)),
  );
  const t = (tp - WEAPON_TP_COST) / (WEAPON_TP_BONUS_CAP - WEAPON_TP_COST);
  return WEAPON_TP_BONUS_MUL_MIN + t * (WEAPON_TP_BONUS_MUL_MAX - WEAPON_TP_BONUS_MUL_MIN);
}


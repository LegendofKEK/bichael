/**
 * Shiny HQ respawns - Pale Hollow field mob promotion (#133).
 *
 * Design:
 * - 3% of respawns promote to HQ/shiny of the same archetype.
 * - +20 levels, same sprite, client sparkle/tint via `shiny` snapshot flag.
 * - HQ + clones are NON-AGGRO (safe): they never auto-pull. Player must engage.
 * - On engage / first pull, HQ summons 4 clones; pack fights and moves as an army.
 * - If HQ kills the player, it relocates (clears fight + despawns clones).
 * - Loot: 10% chance for 1 of ~5 higher-tier **base precursor** mats per archetype
 *   (collectable game-drops for the next craft tier — never finished gear,
 *   intermediates, vendor junk, or synth products).
 */
import type { PaleHollowArchetype } from "./pale-hollow";

/** Chance a field respawn promotes to shiny HQ. */
export const SHINY_HQ_CHANCE_DEFAULT = 0.03;

/** Level bump applied on promotion. */
export const SHINY_LEVEL_BONUS = 20;

/** Clones summoned by a shiny HQ after the player pulls it. */
export const SHINY_CLONE_COUNT = 4;

/** Absolute chance to roll one shiny mat table entry on HQ kill. */
export const SHINY_MAT_DROP_CHANCE = 0.1;

/** How long the HQ keeps walking after a player-kill relocate. */
export const SHINY_FLEE_RELOCATE_MS = 4_500;

export function shinyHqChance(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.max(0, Math.min(1, override));
  }
  return SHINY_HQ_CHANCE_DEFAULT;
}

/**
 * Higher-tier base precursors (~5 per archetype), themed to the mob family.
 * All slugs are catalog `kind: "base"` collectables — inputs for higher crafts,
 * not intermediate synths or finished gear.
 */
export const SHINY_LOOT_BY_ARCHETYPE: Record<PaleHollowArchetype, readonly string[]> = {
  // Beasts / pelts → next-tier hides & beast bones (past soft-pelt)
  dust_hare: ["desiccated-hide", "horn", "giant-femur", "shade-cotton", "ash-dust"],
  // Slimes / alchemy → venom & zone dusts used in higher potions
  pale_slime: ["poison-sac", "slime-oil", "ash-dust", "slag-dust", "sulfur-bit"],
  // Scavengers / cloth scraps → next fiber tier + scrap
  hollow_scavenger: ["shade-cotton", "silk-thread", "velvet-fiber", "parchment", "metal-scrap"],
  // Boars / large beasts → heavy hides, bone, ash timber precursors
  ashbeam_boar: ["desiccated-hide", "horn", "giant-femur", "bloodbeam-log", "ash-dust"],
  // Ruin dwellers → palace/ruin precursors past cracked-brick
  ruin_dweller: ["column-fragment", "marble-chip", "tile-shard", "limestone", "metal-scrap"],
  // Adders / venom reptiles → scale + poison + silk
  cliff_adder: ["poison-sac", "scale-hide", "silk-thread", "velvet-dust", "insect-wing"],
  // Golems / constructs → next ore tier past copper/tin
  seam_golem: ["iron-ore", "darksteel-ore", "mythril-ore", "orichalcum-ore", "metal-scrap"],
  // Wights / undead → elite bone + spectral precursors
  shard_wight: ["giant-femur", "skull-plate", "echo-extract", "parchment", "ash-dust"],
};

export function shinyLootTable(archetype: string): readonly string[] {
  return SHINY_LOOT_BY_ARCHETYPE[archetype as PaleHollowArchetype] ?? SHINY_LOOT_BY_ARCHETYPE.dust_hare;
}

/** Scale HP for the shiny level bump (proportional to authored level). */
export function shinyScaledHp(baseHp: number, baseLevel: number, shinyLevel: number): number {
  const bl = Math.max(1, baseLevel);
  return Math.max(baseHp, Math.floor(baseHp * (shinyLevel / bl)));
}

export function shinyDisplayName(baseName: string): string {
  if (baseName.startsWith("HQ ")) return baseName;
  return `HQ ${baseName}`;
}

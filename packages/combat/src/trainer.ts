/**
 * Trainer (ex-Chronomancer) — paid ability learning.
 *
 * Cost curve (Dust), unlockLevel 1 → 75:
 *   cost = round(500 + (unlockLevel - 1) * (10000 - 500) / (75 - 1))
 *   Lv1 = 500 Dust; Lv75 (top) = 10000 Dust.
 *
 * Free starter kit (intentional — not sold): Rest + each job's L1 signature tools.
 * Everything else requires a Trainer purchase and persists on `learned`.
 */

/** Keep in sync with MAX_LEVEL. */
export const TRAINER_COST_MAX_LEVEL = 75;
export const TRAINER_COST_MIN = 500;
export const TRAINER_COST_MAX = 10000;

/** Dust cost to learn an ability at the given unlock level. */
export function trainerAbilityDustCost(unlockLevel: number): number {
  const lv = Math.max(1, Math.min(TRAINER_COST_MAX_LEVEL, Math.floor(unlockLevel)));
  if (TRAINER_COST_MAX_LEVEL <= 1) return TRAINER_COST_MIN;
  return Math.round(
    TRAINER_COST_MIN +
      ((lv - 1) * (TRAINER_COST_MAX - TRAINER_COST_MIN)) / (TRAINER_COST_MAX_LEVEL - 1),
  );
}

/**
 * Intentional free starter kit — always unlocked by level, never sold.
 * Call out in PR / issue notes: Rest + L1 job signatures (TIM Flux / T.Distortion, etc.).
 */
export const TRAINER_FREE_ABILITY_IDS = [
  "rest",
  // Time Mage L1 essentials (stances / JA — not Chronomancer scrolls)
  "flux",
  "temporal_distortion",
  // Other jobs L1 signature
  "bulwark",
  "ghost_step",
  "sacred_mercy",
  "cl_cure",
  "arcane_flood",
  "killing_storm",
  "spellblade",
  "bm_cure",
] as const;

const FREE_SET = new Set<string>(TRAINER_FREE_ABILITY_IDS);

export function isTrainerFreeAbility(id: string): boolean {
  return FREE_SET.has(id);
}

/** True when the ability must be bought from the Trainer (not free starter). */
export function requiresTrainerPurchase(id: string): boolean {
  return !isTrainerFreeAbility(id);
}

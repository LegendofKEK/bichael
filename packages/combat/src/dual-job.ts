/**
 * Dual-job helpers — main at full level, support at floor(main/2) from L10.
 */
import type { JobId } from "./jobs";
import {
  jobStatsAtLevel,
  jobVitalsAtLevel,
  type AttrStats,
  type Vitals,
} from "./grades";
import { abilitiesUnlockedForJob, type AbilityId } from "./abilities";

/** Main job level required before a support job can be set. */
export const SUBJOB_UNLOCK_LEVEL = 10;

/** Support job effective level = half main (floor). */
export function subjobLevel(mainLevel: number): number {
  return Math.max(1, Math.floor(Math.max(1, mainLevel) / 2));
}

/**
 * Main stats at full level + support job growth from L1 → subLevel
 * (does not double-count the support job’s L1 base).
 */
export function combinedJobStats(
  main: JobId,
  level: number,
  sub: JobId | null | undefined,
): AttrStats {
  const primary = jobStatsAtLevel(main, level);
  if (!sub || level < SUBJOB_UNLOCK_LEVEL) return primary;
  const subLv = subjobLevel(level);
  const subNow = jobStatsAtLevel(sub, subLv);
  const subBase = jobStatsAtLevel(sub, 1);
  return {
    str: primary.str + (subNow.str - subBase.str),
    dex: primary.dex + (subNow.dex - subBase.dex),
    vit: primary.vit + (subNow.vit - subBase.vit),
    agi: primary.agi + (subNow.agi - subBase.agi),
    int: primary.int + (subNow.int - subBase.int),
    mnd: primary.mnd + (subNow.mnd - subBase.mnd),
  };
}

export function combinedJobVitals(
  main: JobId,
  level: number,
  sub: JobId | null | undefined,
): Vitals {
  const primary = jobVitalsAtLevel(main, level);
  if (!sub || level < SUBJOB_UNLOCK_LEVEL) return primary;
  const subLv = subjobLevel(level);
  const subNow = jobVitalsAtLevel(sub, subLv);
  const subBase = jobVitalsAtLevel(sub, 1);
  return {
    maxHp: Math.max(1, primary.maxHp + (subNow.maxHp - subBase.maxHp)),
    maxMp: Math.max(0, primary.maxMp + (subNow.maxMp - subBase.maxMp)),
  };
}

/** Main unlocks at full level + support unlocks at floor(level/2). */
export function abilitiesUnlockedDual(
  main: JobId,
  level: number,
  sub: JobId | null | undefined,
  learned: readonly string[] = [],
): AbilityId[] {
  const mainAb = abilitiesUnlockedForJob(main, level, learned);
  if (!sub || level < SUBJOB_UNLOCK_LEVEL || sub === main) return mainAb;
  const subAb = abilitiesUnlockedForJob(sub, subjobLevel(level), learned);
  return Array.from(new Set<AbilityId>([...mainAb, ...subAb]));
}

/** Effective level for a job you have as main or support (0 if neither). */
export function effectiveJobLevel(
  main: JobId,
  level: number,
  sub: JobId | null | undefined,
  job: JobId,
): number {
  if (main === job) return Math.max(1, level);
  if (sub === job && level >= SUBJOB_UNLOCK_LEVEL) return subjobLevel(level);
  return 0;
}

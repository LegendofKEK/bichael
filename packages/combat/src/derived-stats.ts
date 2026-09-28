import { combinedJobStats } from "./dual-job";
import type { AttrStats } from "./grades";
import type { JobId } from "./jobs";
import {
  aggregateSkillBonuses,
  applyFreeStats,
  type AggregatedSkillBonuses,
  type FreeStatAlloc,
} from "./skill-tree";

/** Auditable attribute derivation shared by authoritative combat and the character sheet. */
export type DerivedAttributeBreakdown = {
  base: AttrStats;
  tree: AggregatedSkillBonuses;
  free: Required<FreeStatAlloc>;
  total: AttrStats;
};

const ATTRS = ["str", "dex", "vit", "agi", "int", "mnd"] as const;

export function deriveCharacterAttributes(
  main: JobId,
  level: number,
  sub: JobId | null | undefined,
  unlocked: readonly string[],
  freeAlloc: FreeStatAlloc = {},
): DerivedAttributeBreakdown {
  const base = combinedJobStats(main, level, sub);
  const tree = aggregateSkillBonuses(unlocked);
  const free = {
    str: freeAlloc.str ?? 0,
    dex: freeAlloc.dex ?? 0,
    vit: freeAlloc.vit ?? 0,
    agi: freeAlloc.agi ?? 0,
    int: freeAlloc.int ?? 0,
    mnd: freeAlloc.mnd ?? 0,
  };
  const withTree = { ...base };
  for (const attr of ATTRS) withTree[attr] += tree[attr];
  return { base, tree, free, total: applyFreeStats(withTree, free) };
}

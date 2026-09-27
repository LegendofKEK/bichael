/**
 * Job grade curves — stats grow with level from job grades, not flat L1 tables.
 * Combat reads Stats; level only selects which row on the grade curve.
 */

import type { JobId } from "./jobs";

/** Same shape as combat `Stats` (kept local to avoid circular import with index). */
export type AttrStats = {
  str: number;
  dex: number;
  vit: number;
  agi: number;
  int: number;
  mnd: number;
};

/** Attribute / HP / MP grade letters (classic MMO). `none` = no MP pool. */
export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "E" | "F" | "none";

export type JobGrades = {
  hp: Grade;
  mp: Grade;
  str: Grade;
  dex: Grade;
  vit: Grade;
  agi: Grade;
  int: Grade;
  mnd: Grade;
};

/** Growth per level after L1 (grade letter → rate). */
const ATTR_GROWTH: Record<Exclude<Grade, "none">, number> = {
  "A+": 0.58,
  A: 0.52,
  "B+": 0.46,
  B: 0.42,
  "C+": 0.36,
  C: 0.32,
  D: 0.24,
  E: 0.16,
  F: 0.1,
};

/** Fallback L1 base when a job has no seed row. */
const ATTR_BASE: Record<Exclude<Grade, "none">, number> = {
  "A+": 14,
  A: 13,
  "B+": 12,
  B: 11,
  "C+": 10,
  C: 9,
  D: 8,
  E: 6,
  F: 5,
};

const HP_GROWTH: Record<Exclude<Grade, "none">, number> = {
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6.2,
  "C+": 5.5,
  C: 5,
  D: 4,
  E: 3,
  F: 2.2,
};

const HP_BASE: Record<Exclude<Grade, "none">, number> = {
  "A+": 150,
  A: 140,
  "B+": 130,
  B: 125,
  "C+": 122,
  C: 120,
  D: 110,
  E: 100,
  F: 90,
};

const MP_GROWTH: Record<Exclude<Grade, "none">, number> = {
  "A+": 6,
  A: 5.2,
  "B+": 4.6,
  B: 4.2,
  "C+": 3.8,
  C: 3.5,
  D: 2.4,
  E: 1.5,
  F: 0.8,
};

const MP_BASE: Record<Exclude<Grade, "none">, number> = {
  "A+": 110,
  A: 100,
  "B+": 90,
  B: 85,
  "C+": 82,
  C: 80,
  D: 60,
  E: 40,
  F: 25,
};

/** Locked grades from Bellgrave job plan §4. */
export const JOB_GRADES: Record<JobId, JobGrades> = {
  time_mage: {
    hp: "C",
    mp: "C",
    str: "E",
    dex: "C",
    vit: "D",
    agi: "B",
    int: "B",
    mnd: "B",
  },
  knight: {
    hp: "A",
    mp: "E",
    str: "B",
    dex: "D",
    vit: "A",
    agi: "E",
    int: "E",
    mnd: "C",
  },
  rogue: {
    hp: "D",
    mp: "none",
    str: "C",
    dex: "A",
    vit: "D",
    agi: "A",
    int: "D",
    mnd: "E",
  },
  cleric: {
    hp: "E",
    mp: "B",
    str: "D",
    dex: "E",
    vit: "C",
    agi: "D",
    int: "D",
    mnd: "A",
  },
  sorcerer: {
    hp: "F",
    mp: "A",
    str: "E",
    dex: "C",
    vit: "E",
    agi: "C",
    int: "A",
    mnd: "D",
  },
  fighter: {
    hp: "B",
    mp: "none",
    str: "A",
    dex: "B",
    vit: "C",
    agi: "C",
    int: "E",
    mnd: "E",
  },
  battle_mage: {
    hp: "D",
    mp: "C",
    str: "C",
    dex: "C",
    vit: "D",
    agi: "D",
    int: "B",
    mnd: "C",
  },
};

/** Exact L1 seeds (TIM matches prior TIM_L1 / createPlayer vitals). */
const JOB_L1_STATS: Partial<Record<JobId, AttrStats>> = {
  time_mage: { str: 6, dex: 10, vit: 8, agi: 12, int: 11, mnd: 14 },
  knight: { str: 11, dex: 7, vit: 14, agi: 5, int: 4, mnd: 9 },
  rogue: { str: 8, dex: 14, vit: 7, agi: 14, int: 6, mnd: 5 },
  sorcerer: { str: 5, dex: 9, vit: 6, agi: 9, int: 14, mnd: 7 },
  fighter: { str: 14, dex: 10, vit: 10, agi: 8, int: 5, mnd: 5 },
  battle_mage: { str: 9, dex: 9, vit: 8, agi: 8, int: 11, mnd: 10 },
  cleric: { str: 7, dex: 6, vit: 10, agi: 6, int: 7, mnd: 15 },
};

const JOB_L1_VITALS: Partial<Record<JobId, { maxHp: number; maxMp: number }>> = {
  time_mage: { maxHp: 120, maxMp: 80 },
  knight: { maxHp: 160, maxMp: 40 },
  rogue: { maxHp: 100, maxMp: 0 },
  sorcerer: { maxHp: 88, maxMp: 100 },
  fighter: { maxHp: 140, maxMp: 0 },
  battle_mage: { maxHp: 115, maxMp: 72 },
  cleric: { maxHp: 95, maxMp: 95 },
};

function clampLevel(level: number): number {
  return Math.max(1, Math.min(75, Math.floor(level)));
}

function attrAt(grade: Grade, level: number, seed?: number): number {
  if (grade === "none") return 0;
  const base = seed ?? ATTR_BASE[grade];
  return Math.max(1, Math.floor(base + (level - 1) * ATTR_GROWTH[grade]));
}

/** Main six at `level` for `job` (from grades + optional L1 seed). */
export function jobStatsAtLevel(job: JobId, level: number): AttrStats {
  const lv = clampLevel(level);
  const g = JOB_GRADES[job];
  const seed = JOB_L1_STATS[job];
  return {
    str: attrAt(g.str, lv, seed?.str),
    dex: attrAt(g.dex, lv, seed?.dex),
    vit: attrAt(g.vit, lv, seed?.vit),
    agi: attrAt(g.agi, lv, seed?.agi),
    int: attrAt(g.int, lv, seed?.int),
    mnd: attrAt(g.mnd, lv, seed?.mnd),
  };
}

export type Vitals = { maxHp: number; maxMp: number };

/** Max HP/MP from HP/MP grades at level. */
export function jobVitalsAtLevel(job: JobId, level: number): Vitals {
  const lv = clampLevel(level);
  const g = JOB_GRADES[job];
  const seed = JOB_L1_VITALS[job];

  let maxHp: number;
  if (g.hp === "none") {
    maxHp = 100;
  } else {
    const base = seed?.maxHp ?? HP_BASE[g.hp];
    maxHp = Math.floor(base + (lv - 1) * HP_GROWTH[g.hp]);
  }

  let maxMp: number;
  if (g.mp === "none") {
    maxMp = 0;
  } else {
    const base = seed?.maxMp ?? MP_BASE[g.mp];
    maxMp = Math.floor(base + (lv - 1) * MP_GROWTH[g.mp]);
  }

  return { maxHp, maxMp };
}

/** @deprecated Prefer jobStatsAtLevel("time_mage", 1) */
export const TIM_L1: AttrStats = jobStatsAtLevel("time_mage", 1);

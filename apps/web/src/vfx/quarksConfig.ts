/**
 * three.quarks combat VFX â€” pool sizes and master toggle.
 * Does not touch hub THREE.Fire campfire.
 */
export const QUARKS_VFX = {
  /** Master toggle â€” set false to skip BatchedRenderer + spawn handlers. */
  enabled: true,
  /** Max concurrent Temporal Distortion / melee hit sparks. */
  hitSparkPool: 8,
  /** Max concurrent cast / Quicken burst systems. */
  castBurstPool: 8,
  /** Soft particle atlas size (procedural radial glow). */
  particleTexSize: 64,
} as const;

export type QuarksVfxKind = "hitSpark" | "castBurst";

export type QuarksSpawnRequest = {
  kind: QuarksVfxKind;
  x: number;
  y: number;
  z: number;
};

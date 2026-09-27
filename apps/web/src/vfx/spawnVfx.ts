import { QUARKS_VFX, type QuarksSpawnRequest, type QuarksVfxKind } from "./quarksConfig";

type Handler = (req: QuarksSpawnRequest) => void;

let handler: Handler | null = null;

/** Registered by QuarksVfxLayer while mounted. */
export function setQuarksSpawnHandler(next: Handler | null): void {
  handler = next;
}

/**
 * Fire a one-shot particle effect at a world position.
 * Safe to call from combat hooks even if the layer is disabled / unmounted.
 */
export function spawnVfx(
  kind: QuarksVfxKind,
  pos: { x: number; y?: number; z: number },
): void {
  if (!QUARKS_VFX.enabled || !handler) return;
  handler({
    kind,
    x: pos.x,
    y: pos.y ?? 0,
    z: pos.z,
  });
}

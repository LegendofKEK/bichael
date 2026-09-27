import type { UnitSnapshot } from "@bellgrave/protocol";

export type SheetAnim = "idle" | "walk" | "melee" | "cast" | "rest" | "dead";

type SheetDef = {
  url: string;
  frames: number;
  fps: number;
};

/** Canonical TIM set — all poses keyed from the same idle design. */
const TIM: Record<SheetAnim, SheetDef> = {
  idle: { url: "/sprites/tim-idle-v1.png", frames: 1, fps: 1 },
  walk: { url: "/sprites/tim-walk-v2.png", frames: 1, fps: 1 },
  melee: { url: "/sprites/tim-melee-v4.png", frames: 1, fps: 1 },
  cast: { url: "/sprites/tim-cast-v2.png", frames: 1, fps: 1 },
  rest: { url: "/sprites/tim-rest-v1.png", frames: 1, fps: 1 },
  dead: { url: "/sprites/tim-idle-v1.png", frames: 1, fps: 1 },
};

const GUARD: Record<SheetAnim, SheetDef> = {
  idle: { url: "/sprites/guard-idle-v1.png", frames: 1, fps: 1 },
  walk: { url: "/sprites/guard-idle-v1.png", frames: 1, fps: 1 },
  melee: { url: "/sprites/guard-melee-v1.png", frames: 1, fps: 1 },
  cast: { url: "/sprites/guard-idle-v1.png", frames: 1, fps: 1 },
  rest: { url: "/sprites/guard-idle-v1.png", frames: 1, fps: 1 },
  dead: { url: "/sprites/guard-idle-v1.png", frames: 1, fps: 1 },
};

export function sheetFor(unit: UnitSnapshot): SheetDef {
  const table = unit.kind === "mob" ? GUARD : TIM;
  return table[unit.anim] ?? table.idle;
}

export const FLOOR_TEX = "/sprites/hall-floor.png";

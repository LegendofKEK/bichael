/** Procedural pixel sprites for MVP (SE ¾ view). Replace with packed sheets in V1. */

export type SpriteKind = "tim" | "guard";
export type SpriteAnim = "idle" | "walk" | "melee" | "cast" | "dead";

const W = 48;
const H = 64;

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawTim(
  ctx: CanvasRenderingContext2D,
  frame: number,
  anim: SpriteAnim,
  flux: boolean,
) {
  ctx.clearRect(0, 0, W, H);
  const robe = flux ? "#2a7a76" : "#6b4a1e";
  const robeDark = flux ? "#1a5552" : "#4a3212";
  const trim = flux ? "#5ee0d6" : "#c9a227";
  const skin = "#d4a574";
  const bob = anim === "walk" ? (frame % 2 === 0 ? 0 : 1) : 0;
  const swing = anim === "melee" ? (frame % 4) : 0;
  const castLift = anim === "cast" ? 2 + (frame % 2) : 0;

  if (anim === "dead") {
    px(ctx, 8, 40, 32, 10, robe);
    px(ctx, 14, 36, 10, 8, skin);
    return;
  }

  // shadow already in 3D — legs
  const legY = 48 + bob;
  px(ctx, 18, legY, 5, 10, "#2a2a30");
  px(ctx, 26, legY + (anim === "walk" && frame % 2 ? -1 : 0), 5, 10, "#2a2a30");

  // robe body (SE: right side wider)
  px(ctx, 14, 22 + bob, 22, 28, robe);
  px(ctx, 30, 24 + bob, 6, 24, robeDark);
  px(ctx, 14, 22 + bob, 22, 3, trim);

  // arms
  px(ctx, 10, 26 + bob, 5, 14, robe);
  px(ctx, 32, 26 + bob - castLift, 5, 14, robe);

  // head / hood
  px(ctx, 18, 10 + bob, 14, 14, robeDark);
  px(ctx, 20, 14 + bob, 10, 8, skin);
  px(ctx, 16, 8 + bob, 18, 5, robe);

  // staff (right hand, SE)
  const staffX = 34 + (swing > 1 ? 2 : 0);
  const staffY = 8 + bob - castLift - (swing === 1 ? 4 : 0);
  px(ctx, staffX, staffY, 3, 42, "#5c4030");
  px(ctx, staffX - 1, staffY, 5, 5, trim);
  if (flux) px(ctx, staffX, staffY - 2, 3, 3, "#a8fff8");
}

function drawGuard(ctx: CanvasRenderingContext2D, frame: number, anim: SpriteAnim) {
  ctx.clearRect(0, 0, W, H);
  // Distinct stone golem — intentionally NOT robe-shaped
  if (anim === "dead") {
    px(ctx, 4, 44, 40, 14, "#55555e");
    return;
  }
  const bob = anim === "walk" ? (frame % 2 === 0 ? 0 : 1) : 0;
  const swing = anim === "melee" ? (frame % 4) : 0;

  // wide stone legs
  px(ctx, 12, 48 + bob, 10, 12, "#4e4e58");
  px(ctx, 26, 48 + bob, 10, 12, "#4e4e58");
  // massive torso slab
  px(ctx, 8, 18 + bob, 32, 32, "#9a9aa8");
  px(ctx, 8, 18 + bob, 32, 6, "#c0c0cc");
  px(ctx, 12, 28 + bob, 24, 4, "#3a3a44");
  px(ctx, 14, 36 + bob, 20, 3, "#5a6a50");
  // block head (square helm)
  px(ctx, 14, 2 + bob, 20, 18, "#6a6a74");
  px(ctx, 16, 4 + bob, 16, 12, "#8e8e9a");
  px(ctx, 18, 8 + bob, 5, 5, "#ff3030");
  px(ctx, 27, 8 + bob, 5, 5, "#ff3030");
  // halberd
  const sx = 40 + (swing > 1 ? 3 : 0);
  px(ctx, sx, 0 + bob, 4, 56, "#c8c8a0");
  px(ctx, sx - 6, 0 + bob, 16, 10, "#e8e8d0");
}

const cache = new Map<string, HTMLCanvasElement>();
const CACHE_VER = "v3";

export function getSpriteCanvas(
  kind: SpriteKind,
  anim: SpriteAnim,
  frame: number,
  flux = false,
): HTMLCanvasElement {
  const key = `${CACHE_VER}:${kind}:${anim}:${frame}:${flux ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  if (kind === "tim") drawTim(ctx, frame, anim, flux);
  else drawGuard(ctx, frame, anim);
  cache.set(key, c);
  return c;
}

export function animFrameCount(anim: SpriteAnim): number {
  switch (anim) {
    case "walk":
      return 6;
    case "melee":
      return 4;
    case "cast":
      return 8;
    default:
      return 6;
  }
}

export const SPRITE_SIZE = { w: W, h: H };

/**
 * Curved modular stone retaining walls along both riverbanks + stone masonry spans.
 * Walls sit just outside the water ribbon and hide the heightfield crease.
 * Cool grey fantasy masonry (block + charcoal grout) — not chalk beige or warm dirt.
 * No cylinder coping ribs, no cast-shadow starbursts.
 */
import {
  paleHollowBridgeCurveY,
  paleHollowBridgeGeom,
  paleHollowInBridgeWallVisualGap,
  paleHollowTerrainMeshY,
  paleHollowRiverCenterX,
  paleHollowTributaryCenterX,
  paleHollowWalkable,
  PH_BRIDGE_DECK_HALF_T,
  PH_BRIDGE_DECK_W,
  PH_BRIDGE_SITES,
  PH_RIVER_MAIN,
  PH_RIVER_TRIB,
  PH_RIVER_WALL,
  type PaleHollowBridgeSite,
  type PaleHollowRiverKind,
} from "@bellgrave/config";
import { useMemo } from "react";
import * as THREE from "three";
import { send } from "./net";

/** ~2.5–3 ft body — raised so tops read from the iso camera. */
const WALL_H = PH_RIVER_WALL.h;
const WALL_THICK = PH_RIVER_WALL.thick;
/** Thin dark top course (not chalk rim, not cylinder). */
const COPE_H = PH_RIVER_WALL.copeH;
const COPE_OVER = 0.06;
/**
 * Distance from river center to wall midline — tight to the water edge.
 * Keep in sync with PaleHollowRivers halfW (inner face ≈ bankDist - WALL_THICK/2).
 */
const MAIN_BANK = PH_RIVER_MAIN.bankDist;
const TRIB_BANK = PH_RIVER_TRIB.bankDist;

/** Material tints — cool grey with blue/green undertones (never beige/mud). */
const TINT_WALL = "#9aa5aa";
const TINT_COPE = "#7e8a8e";
const TINT_DECK = "#a8b2b6";
const TINT_RAIL = "#8e989c";
const TINT_PILLAR = "#868f94";

type WallSeg = {
  x: number;
  z: number;
  y: number;
  h: number;
  len: number;
  yaw: number;
};

function hash2(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Running-bond wall blocks + deep charcoal grout + hand-painted weathering. */
function makeModularStoneAlbedo(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;

  // Cool base (subtle blue-green), not chalk white / warm beige
  ctx.fillStyle = "#8e9a9e";
  ctx.fillRect(0, 0, s, s);

  const grout = "#2a2e32";
  const courses = 5;
  const courseH = s / courses;
  const groutW = 5;

  for (let row = 0; row < courses; row++) {
    const y0 = row * courseH;
    const bond = row % 2 === 1 ? 0.5 : 0;
    const blocks = 4;
    const blockW = s / blocks;
    for (let col = 0; col < blocks + 1; col++) {
      const x0 = (col - bond) * blockW;
      const pad = groutW * 0.5;
      const bx = x0 + pad;
      const by = y0 + pad;
      const bw = Math.max(4, blockW - groutW);
      const bh = Math.max(4, courseH - groutW);

      const h = hash2(row * 17 + 3, col * 31 + 7);
      const coolR = Math.floor(130 + h * 28);
      const coolG = Math.floor(142 + h * 22 + (h > 0.55 ? 6 : 0));
      const coolB = Math.floor(148 + h * 26 + (h < 0.4 ? 8 : 0));
      ctx.fillStyle = `rgb(${coolR},${coolG},${coolB})`;
      ctx.fillRect(bx, by, bw, bh);

      // Soft top-edge highlight (beveled catch-light)
      ctx.fillStyle = `rgba(210, 220, 224, ${0.14 + h * 0.1})`;
      ctx.fillRect(bx + 1, by + 1, bw - 2, 3);

      // Shade variation blotches
      ctx.fillStyle = `rgba(70, 82, 88, ${0.08 + h * 0.1})`;
      ctx.fillRect(bx + bw * 0.15, by + bh * 0.35, bw * 0.35, bh * 0.28);
      if (h > 0.45) {
        ctx.fillStyle = `rgba(160, 178, 182, ${0.1 + h * 0.08})`;
        ctx.fillRect(bx + bw * 0.5, by + bh * 0.15, bw * 0.28, bh * 0.22);
      }

      // Scratches / cracks
      ctx.strokeStyle = `rgba(40, 46, 50, ${0.35 + h * 0.25})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sx0 = bx + 4 + h * (bw - 10);
      const sy0 = by + 4 + hash2(col, row) * (bh - 10);
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + 6 + h * 10, sy0 + (hash2(row, col) - 0.5) * 8);
      ctx.stroke();
      if (h > 0.6) {
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.2, by + bh * 0.7);
        ctx.lineTo(bx + bw * 0.45, by + bh * 0.55);
        ctx.stroke();
      }

      // Corner chip
      if (h > 0.7) {
        ctx.fillStyle = "rgba(50, 56, 60, 0.45)";
        ctx.fillRect(bx + bw - 5, by + bh - 4, 4, 3);
      }
    }
    // Horizontal grout
    ctx.fillStyle = grout;
    ctx.fillRect(0, y0 + courseH - groutW * 0.5, s, groutW);
  }
  // Vertical grout seams (approximate bond)
  ctx.fillStyle = grout;
  for (let row = 0; row < courses; row++) {
    const y0 = row * courseH;
    const bond = row % 2 === 1 ? 0.5 : 0;
    const blocks = 4;
    const blockW = s / blocks;
    for (let col = 0; col <= blocks; col++) {
      const x = (col - bond) * blockW - groutW * 0.5;
      ctx.fillRect(x, y0, groutW, courseH);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 0.85);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Large fitted paving stones of varying sizes for bridge decks. */
function makePavingStoneAlbedo(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2c3034";
  ctx.fillRect(0, 0, s, s);

  const cells: { x: number; y: number; w: number; h: number }[] = [];
  // Irregular puzzle-like grid
  const rowYs = [0, 58, 118, 178, 256];
  for (let r = 0; r < rowYs.length - 1; r++) {
    const y0 = rowYs[r]!;
    const y1 = rowYs[r + 1]!;
    let x = 0;
    let col = 0;
    while (x < s - 8) {
      const h = hash2(r * 13, col * 19);
      const w = Math.min(s - x, 48 + Math.floor(h * 56));
      cells.push({ x, y: y0, w, h: y1 - y0 });
      x += w;
      col++;
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const gap = 3;
    const h = hash2(i * 7, cell.x + cell.y);
    const r = Math.floor(155 + h * 30);
    const g = Math.floor(164 + h * 24 + (h > 0.5 ? 4 : 0));
    const b = Math.floor(168 + h * 28);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(cell.x + gap, cell.y + gap, cell.w - gap * 2, cell.h - gap * 2);

    ctx.fillStyle = `rgba(220, 228, 232, ${0.12 + h * 0.1})`;
    ctx.fillRect(cell.x + gap + 1, cell.y + gap + 1, cell.w - gap * 2 - 2, 2);

    ctx.strokeStyle = `rgba(45, 52, 56, ${0.3 + h * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cell.x + gap + 6, cell.y + gap + cell.h * 0.4);
    ctx.lineTo(cell.x + gap + cell.w * 0.4, cell.y + gap + cell.h * 0.55);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function bankPoint(
  centerX: (z: number) => number,
  z: number,
  side: 1 | -1,
  bankDist: number,
): { x: number; z: number; yaw: number } {
  const eps = 0.85;
  const c0 = centerX(z - eps);
  const c1 = centerX(z + eps);
  const tx = c1 - c0;
  const tz = eps * 2;
  const tLen = Math.hypot(tx, tz) || 1;
  // Perpendicular in XZ (right of downstream)
  const px = -tz / tLen;
  const pz = tx / tLen;
  return {
    x: centerX(z) + side * bankDist * px,
    z: z + side * bankDist * pz,
    yaw: Math.atan2(tx, tz),
  };
}

function buildWallSegments(
  centerX: (z: number) => number,
  z0: number,
  z1: number,
  bankDist: number,
  step: number,
  river: PaleHollowRiverKind,
): { left: WallSeg[]; right: WallSeg[] } {
  const zs: number[] = [];
  for (let z = z0; z <= z1; z += step) zs.push(z);
  if (zs[zs.length - 1]! < z1 - 0.01) zs.push(z1);

  const makeSide = (side: 1 | -1): WallSeg[] => {
    const pts = zs.map((z) => bankPoint(centerX, z, side, bankDist));
    const segs: WallSeg[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const mx = (a.x + b.x) * 0.5;
      const mz = (a.z + b.z) * 0.5;
      // Omit only where the stone deck actually covers the bank — tight footprint,
      // not a wide raw-Z window that left holes with no bridge above them.
      if (paleHollowInBridgeWallVisualGap(mx, mz, river)) continue;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.15) continue;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      // Seat on the visible mesh. A long bed average was lifting walls off the
      // north meander where a mountain lobe spiked the samples upstream.
      const bed = paleHollowTerrainMeshY(mx, mz);
      if (!Number.isFinite(mx) || !Number.isFinite(mz) || !Number.isFinite(bed)) continue;
      const y = bed + 0.04 + WALL_H * 0.5;
      segs.push({ x: mx, z: mz, y, h: WALL_H, len: len + 0.12, yaw });
    }
    return segs;
  };

  return { left: makeSide(-1), right: makeSide(1) };
}

/**
 * Semicircular bank that closes a channel end. Arc meets both straight walls
 * and bulges outward so the water sits in a bowl.
 */
function buildCuldesac(
  centerX: (z: number) => number,
  zEnd: number,
  bankDist: number,
  outward: 1 | -1,
): WallSeg[] {
  const eps = 0.85;
  const tx = centerX(zEnd + eps) - centerX(zEnd - eps);
  const tz = eps * 2;
  const tLen = Math.hypot(tx, tz) || 1;
  const fx = tx / tLen;
  const fz = tz / tLen;
  const rx = -fz;
  const rz = fx;
  const ox = fx * outward;
  const oz = fz * outward;
  const cx = centerX(zEnd);
  const n = Math.max(12, Math.round((Math.PI * bankDist) / 0.8));
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const theta = Math.PI * (1 - i / n);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    pts.push({
      x: cx + bankDist * (c * rx + s * ox),
      z: zEnd + bankDist * (c * rz + s * oz),
    });
  }
  const segs: WallSeg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const bed = paleHollowTerrainMeshY(mx, mz);
    if (!Number.isFinite(mx) || !Number.isFinite(mz) || !Number.isFinite(bed)) continue;
    segs.push({
      x: mx,
      z: mz,
      y: bed + 0.04 + WALL_H * 0.5,
      h: WALL_H,
      len: len + 0.16,
      yaw,
    });
  }
  return segs;
}

type BridgeDef = {
  x: number;
  z: number;
  span: number;
  /** Mid-span curve height. */
  deckY: number;
  leftY: number;
  rightY: number;
  /** Extra mid-span height above the left→right lerp. */
  arch: number;
  waterY: number;
  /**
   * Orients local +Z along bank→bank (deck LENGTH) and local +X along flow (deck WIDTH).
   * Same length-on-Z convention as WallRun; quaternion avoids yaw ±π/2 sign mistakes.
   */
  quat: THREE.Quaternion;
  /** Unit bank→bank (local +Z). Left end is -spanDir. */
  spanDir: { x: number; z: number };
  /** Unit along-flow (local +X). */
  flowDir: { x: number; z: number };
  postL: { x: number; z: number; y: number };
  postR: { x: number; z: number; y: number };
};

/**
 * Build modular stone spans from shared config geometry (same deckY / footprint as walk).
 * Quaternion: local +Z = bank→bank (spanDir); posts land on bank ends — not origin.
 */
function buildBridges(sites: readonly PaleHollowBridgeSite[]): BridgeDef[] {
  const out: BridgeDef[] = [];
  for (const site of sites) {
    const g = paleHollowBridgeGeom(site);
    // local +Z → bank→bank (long deck axis). Walls also put length on local Z.
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(g.spanDir.x, 0, g.spanDir.z),
    );

    out.push({
      x: g.x,
      z: g.zWorld,
      span: g.span,
      deckY: g.deckY,
      leftY: g.leftY,
      rightY: g.rightY,
      arch: g.arch,
      waterY: g.waterY,
      quat,
      spanDir: { ...g.spanDir },
      flowDir: { ...g.flowDir },
      postL: { ...g.postL },
      postR: { ...g.postR },
    });
  }
  return out;
}

type StoneMats = {
  wall: THREE.MeshStandardMaterial;
  cope: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial;
  pillar: THREE.MeshStandardMaterial;
};

function WallRun({ segs, mats }: { segs: WallSeg[]; mats: StoneMats }) {
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]}>
          <mesh position={[0, s.y, 0]} castShadow={false} receiveShadow={false} material={mats.wall}>
            <boxGeometry args={[WALL_THICK, s.h, s.len]} />
          </mesh>
          {s.h > 0.45 && (
          <mesh
            position={[0, s.y + s.h * 0.5 + COPE_H * 0.5, 0]}
            castShadow={false}
            receiveShadow={false}
            material={mats.cope}
          >
            <boxGeometry args={[WALL_THICK + COPE_OVER, COPE_H, s.len + 0.02]} />
          </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Beveled square cap (shallow truncated pyramid via stacked boxes). */
function StoneCap({
  size,
  mat,
}: {
  size: number;
  mat: THREE.MeshStandardMaterial;
}) {
  return (
    <group>
      <mesh castShadow={false} receiveShadow={false} material={mat}>
        <boxGeometry args={[size, size * 0.2, size]} />
      </mesh>
      <mesh position={[0, size * 0.16, 0]} castShadow={false} receiveShadow={false} material={mat}>
        <boxGeometry args={[size * 0.72, size * 0.14, size * 0.72]} />
      </mesh>
    </group>
  );
}

/**
 * One extruded ribbon along the arch. Neighboring quads share the station edge
 * exactly (no overlap, no gap). Top/bottom/sides are separate vertex islands so
 * the crease stays sharp while the arch itself shades smoothly.
 * `centerY(t)` is the vertical middle of the ribbon; walk height is that curve.
 */
function archRibbonGeometry(opts: {
  cx: number;
  cz: number;
  span: number;
  spanDir: { x: number; z: number };
  flowDir: { x: number; z: number };
  centerY: (t: number) => number;
  halfW: number;
  halfT: number;
  segs: number;
}): THREE.BufferGeometry {
  const { cx, cz, span, spanDir, flowDir, centerY, halfW, halfT, segs } = opts;
  const stations = segs + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  const pushV = (x: number, y: number, z: number, u: number, v: number) => {
    pos.push(x, y, z);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };

  const station = (i: number) => {
    const t = i / segs;
    const along = (t - 0.5) * span;
    const y = centerY(t);
    return {
      x: cx + spanDir.x * along,
      z: cz + spanDir.z * along,
      y,
      v: (t * span) / 1.35,
    };
  };

  const addStrip = (
    yOf: (s: ReturnType<typeof station>, edge: -1 | 1) => number,
    winding: "up" | "down",
  ) => {
    const base = pos.length / 3;
    for (let i = 0; i < stations; i++) {
      const s = station(i);
      for (const edge of [-1, 1] as const) {
        pushV(
          s.x + flowDir.x * halfW * edge,
          yOf(s, edge),
          s.z + flowDir.z * halfW * edge,
          edge === -1 ? 0 : 1,
          s.v,
        );
      }
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (winding === "up") idx.push(a, c, d, a, d, b);
      else idx.push(a, b, d, a, d, c);
    }
  };

  // Top (+Y) and bottom (−Y), centered on the walk curve.
  addStrip((s) => s.y + halfT, "up");
  addStrip((s) => s.y - halfT, "down");

  const addSide = (edge: -1 | 1) => {
    const base = pos.length / 3;
    for (let i = 0; i < stations; i++) {
      const s = station(i);
      const x = s.x + flowDir.x * halfW * edge;
      const z = s.z + flowDir.z * halfW * edge;
      pushV(x, s.y - halfT, z, s.v, 0);
      pushV(x, s.y + halfT, z, s.v, 1);
    }
    for (let i = 0; i < segs; i++) {
      const bot = base + i * 2;
      const top = bot + 1;
      const botN = bot + 2;
      const topN = bot + 3;
      // +flow side outward is span × up; −flow is the opposite winding.
      if (edge === 1) idx.push(bot, botN, top, botN, topN, top);
      else idx.push(bot, top, botN, top, topN, botN);
    }
  };
  addSide(-1);
  addSide(1);

  const addCap = (i: number, end: "start" | "end") => {
    const s = station(i);
    const base = pos.length / 3;
    for (const edge of [-1, 1] as const) {
      const x = s.x + flowDir.x * halfW * edge;
      const z = s.z + flowDir.z * halfW * edge;
      pushV(x, s.y - halfT, z, edge === -1 ? 0 : 1, 0);
      pushV(x, s.y + halfT, z, edge === -1 ? 0 : 1, 1);
    }
    const lb = base;
    const lt = base + 1;
    const rb = base + 2;
    const rt = base + 3;
    if (end === "start") idx.push(lb, rb, rt, lb, rt, lt);
    else idx.push(lb, lt, rt, lb, rt, rb);
  };
  addCap(0, "start");
  addCap(segs, "end");

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function StoneBridge({ b, mats }: { b: BridgeDef; mats: StoneMats }) {
  const deckW = PH_BRIDGE_DECK_W;
  const railOff = deckW * 0.42;
  const deckHalfT = PH_BRIDGE_DECK_HALF_T;
  const deckT = deckHalfT * 2;
  const curveAt = (t: number) => paleHollowBridgeCurveY(b.leftY, b.rightY, b.arch, t);
  const segs = Math.max(28, Math.round(b.span / 0.55));

  const deckGeo = useMemo(
    () =>
      archRibbonGeometry({
        cx: b.x,
        cz: b.z,
        span: b.span,
        spanDir: b.spanDir,
        flowDir: b.flowDir,
        centerY: curveAt,
        halfW: deckW * 0.5,
        halfT: deckHalfT,
        segs,
      }),
    [b, segs, deckW, deckHalfT],
  );

  const railGeos = useMemo(() => {
    const railHalfW = 0.14;
    const railHalfT = 0.11;
    return ([-1, 1] as const).map((side) =>
      archRibbonGeometry({
        cx: b.x + b.flowDir.x * railOff * side,
        cz: b.z + b.flowDir.z * railOff * side,
        span: b.span,
        spanDir: b.spanDir,
        flowDir: b.flowDir,
        centerY: (t) => curveAt(t) + deckHalfT + railHalfT,
        halfW: railHalfW,
        halfT: railHalfT,
        segs,
      }),
    );
  }, [b, segs, railOff, deckHalfT]);

  const posts = useMemo(() => {
    const n = Math.max(3, Math.round(b.span / 2.4));
    return Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      return { t, along: (t - 0.5) * b.span * 0.92, y: curveAt(t) };
    });
  }, [b]);

  return (
    <group renderOrder={8}>
      <mesh
        geometry={deckGeo}
        castShadow={false}
        receiveShadow={false}
        material={mats.deck}
        renderOrder={8}
        onClick={(e) => {
          e.stopPropagation();
          if (!paleHollowWalkable(e.point.x, e.point.z)) return;
          send({ type: "move", x: e.point.x, z: e.point.z });
        }}
      />

      {railGeos.map((geo, side) => (
        <mesh key={`rail-${side}`} geometry={geo} castShadow={false} receiveShadow={false} material={mats.rail} />
      ))}

      {([-1, 1] as const).map((side) => {
        const ox = b.flowDir.x * railOff * side;
        const oz = b.flowDir.z * railOff * side;
        return (
          <group key={`posts-${side}`}>
            {posts.map((p, pi) => {
              const isCorner = pi === 0 || pi === posts.length - 1;
              const px = b.x + ox + b.spanDir.x * p.along;
              const pz = b.z + oz + b.spanDir.z * p.along;
              const postSize = isCorner ? 0.32 : 0.22;
              const postH = isCorner ? 0.55 : 0.42;
              const capSize = isCorner ? 0.4 : 0.28;
              return (
                <group key={pi} position={[px, p.y + deckT * 0.5 + postH * 0.5, pz]} quaternion={b.quat}>
                  <mesh castShadow={false} receiveShadow={false} material={isCorner ? mats.pillar : mats.rail}>
                    <boxGeometry args={[postSize, postH, postSize]} />
                  </mesh>
                  <group position={[0, postH * 0.5 + 0.02, 0]}>
                    <StoneCap size={capSize} mat={isCorner ? mats.pillar : mats.rail} />
                  </group>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Bank-end pillars — tops meet each bank's curve end */}
      {([
        { end: -1 as const, post: b.postL, endY: b.leftY },
        { end: 1 as const, post: b.postR, endY: b.rightY },
      ]).map(({ end, post, endY }) =>
        ([-1, 1] as const).map((side) => {
          const ox = b.flowDir.x * railOff * side;
          const oz = b.flowDir.z * railOff * side;
          const px = post.x + ox;
          const pz = post.z + oz;
          const bankY = Math.min(post.y, endY);
          const h = Math.max(0.35, endY - bankY + deckT * 0.5);
          return (
            <group key={`end-${end}-${side}`} position={[px, bankY + h * 0.5, pz]} quaternion={b.quat}>
              <mesh castShadow={false} receiveShadow={false} material={mats.pillar}>
                <boxGeometry args={[0.48, h, 0.48]} />
              </mesh>
              <group position={[0, h * 0.5 + 0.04, 0]}>
                <StoneCap size={0.52} mat={mats.pillar} />
              </group>
            </group>
          );
        }),
      )}
    </group>
  );
}

export function PaleHollowRiverBanks() {
  const wallMap = useMemo(() => makeModularStoneAlbedo(), []);
  const paveMap = useMemo(() => makePavingStoneAlbedo(), []);

  const mats = useMemo((): StoneMats => {
    const mk = (map: THREE.Texture, color: string, rough: number, opts?: { wall?: boolean }) => {
      const m = new THREE.MeshStandardMaterial({
        map,
        color: new THREE.Color(color),
        roughness: rough,
        metalness: 0.02,
        depthWrite: true,
      });
      // Push retaining walls slightly back so abutment pillars don't z-fight
      if (opts?.wall) {
        m.polygonOffset = true;
        m.polygonOffsetFactor = 1;
        m.polygonOffsetUnits = 1;
      }
      return m;
    };
    return {
      wall: mk(wallMap, TINT_WALL, 0.9, { wall: true }),
      cope: mk(wallMap, TINT_COPE, 0.88, { wall: true }),
      deck: mk(paveMap, TINT_DECK, 0.86),
      rail: mk(wallMap, TINT_RAIL, 0.9),
      pillar: mk(wallMap, TINT_PILLAR, 0.88),
    };
  }, [wallMap, paveMap]);

  const mainWalls = useMemo(
    () =>
      buildWallSegments(
        paleHollowRiverCenterX,
        PH_RIVER_MAIN.z0,
        PH_RIVER_MAIN.z1,
        MAIN_BANK,
        1.15,
        "main",
      ),
    [],
  );
  const tribWalls = useMemo(
    () =>
      buildWallSegments(
        paleHollowTributaryCenterX,
        PH_RIVER_TRIB.z0,
        PH_RIVER_TRIB.z1,
        TRIB_BANK,
        1.25,
        "tributary",
      ),
    [],
  );

  const bowls = useMemo(
    () => [
      ...buildCuldesac(paleHollowRiverCenterX, PH_RIVER_MAIN.z0, MAIN_BANK, -1),
      ...buildCuldesac(paleHollowRiverCenterX, PH_RIVER_MAIN.z1, MAIN_BANK, 1),
      ...buildCuldesac(paleHollowTributaryCenterX, PH_RIVER_TRIB.z0, TRIB_BANK, -1),
      ...buildCuldesac(paleHollowTributaryCenterX, PH_RIVER_TRIB.z1, TRIB_BANK, 1),
    ],
    [],
  );
  const mainBridges = useMemo(
    () => buildBridges(PH_BRIDGE_SITES.filter((s) => s.river === "main")),
    [],
  );
  const tribBridges = useMemo(
    () => buildBridges(PH_BRIDGE_SITES.filter((s) => s.river === "tributary")),
    [],
  );

  return (
    <group>
      <WallRun segs={mainWalls.left} mats={mats} />
      <WallRun segs={mainWalls.right} mats={mats} />
      <WallRun segs={tribWalls.left} mats={mats} />
      <WallRun segs={tribWalls.right} mats={mats} />
      <WallRun segs={bowls} mats={mats} />
      {mainBridges.map((b, i) => (
        <StoneBridge key={`mb-${i}`} b={b} mats={mats} />
      ))}
      {tribBridges.map((b, i) => (
        <StoneBridge key={`tb-${i}`} b={b} mats={mats} />
      ))}
    </group>
  );
}

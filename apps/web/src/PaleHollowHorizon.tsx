/**
 * Distant scenery beyond playable Pale Hollow bounds.
 * Soft visual skirt + foothills + sky dome — not walkable (clampPaleHollow unchanged).
 * Static / low LOD: one skirt mesh, one instanced hill batch, one sky dome.
 */
import { PALE_HOLLOW_BOUNDS, paleHollowHeight } from "@bellgrave/config";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** How far past playable bounds the visual skirt extends. */
const SKIRT_PAD = 56;
/** Low grid density — readable hills, not interactive clutter. */
const SKIRT_SEGS_CROSS = 10;
const SKIRT_SEGS_ALONG_X = 26;
const SKIRT_SEGS_ALONG_Z = 34;

const FOOTHILL_COUNT = 48;

function hash2(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Distance outside playable rect (0 on/inside edge, >0 beyond). */
function outsidePad(x: number, z: number): number {
  return Math.max(
    0,
    Math.max(
      PALE_HOLLOW_BOUNDS.minX - x,
      x - PALE_HOLLOW_BOUNDS.maxX,
      PALE_HOLLOW_BOUNDS.minZ - z,
      z - PALE_HOLLOW_BOUNDS.maxZ,
    ),
  );
}

/**
 * Extrapolated ground beyond the playable heightfield.
 * Matches the rim at the shared edge, then rolls into foothills / plains.
 */
function skirtHeight(x: number, z: number): number {
  let y = paleHollowHeight(x, z);
  const out = outsidePad(x, z);
  const fade = smooth01(Math.min(1, out / 16));
  if (fade < 0.001) return y;

  const roll =
    Math.sin(x * 0.017 + 1.3) * 1.55 +
    Math.cos(z * 0.013 - 0.4) * 1.25 +
    Math.sin(x * 0.038 - z * 0.029) * 0.9 +
    Math.sin(x * 0.09 + z * 0.07) * 0.28;
  const rise = (1 - Math.exp(-out * 0.04)) * (2.4 + hash2(Math.floor(x), Math.floor(z)) * 2.6);
  // Soft plains dip between ridge lobes so it reads as "more basin", not a wall.
  const plains = Math.sin(x * 0.011 + z * 0.009) * 0.65;

  y += fade * (roll + rise + plains);
  return y;
}

function buildSkirtStrip(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  segX: number,
  segZ: number,
): THREE.BufferGeometry {
  const w = maxX - minX;
  const d = maxZ - minZ;
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const colors: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    const y = skirtHeight(x, z);
    pos.setY(i, y);

    const out = outsidePad(x, z);
    const n = hash2(Math.floor(x * 0.4), Math.floor(z * 0.4));
    // Near rim: meadow green; farther: cooler forest / chalk ridge
    const t = smooth01(out / SKIRT_PAD);
    const r = (0.42 + n * 0.06) * (1 - t) + (0.48 + n * 0.05) * t;
    const g = (0.52 + n * 0.05) * (1 - t) + (0.5 + n * 0.04) * t;
    const b = (0.34 + n * 0.04) * (1 - t) + (0.4 + n * 0.05) * t;
    colors.push(r, g, b);
  }

  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.translate(cx, 0, cz);
  return geo;
}

function buildSkirtStrips(): THREE.BufferGeometry[] {
  const b = PALE_HOLLOW_BOUNDS;
  const pad = SKIRT_PAD;
  // Slight inset so the strip tucks under the playable mesh edge (no light gap).
  const inset = 0.35;
  return [
    // West
    buildSkirtStrip(b.minX - pad, b.minX + inset, b.minZ, b.maxZ, SKIRT_SEGS_CROSS, SKIRT_SEGS_ALONG_Z),
    // East
    buildSkirtStrip(b.maxX - inset, b.maxX + pad, b.minZ, b.maxZ, SKIRT_SEGS_CROSS, SKIRT_SEGS_ALONG_Z),
    // South
    buildSkirtStrip(b.minX, b.maxX, b.minZ - pad, b.minZ + inset, SKIRT_SEGS_ALONG_X, SKIRT_SEGS_CROSS),
    // North
    buildSkirtStrip(b.minX, b.maxX, b.maxZ - inset, b.maxZ + pad, SKIRT_SEGS_ALONG_X, SKIRT_SEGS_CROSS),
    // Corners (fill diagonal voids)
    buildSkirtStrip(b.minX - pad, b.minX + inset, b.minZ - pad, b.minZ + inset, SKIRT_SEGS_CROSS, SKIRT_SEGS_CROSS),
    buildSkirtStrip(b.maxX - inset, b.maxX + pad, b.minZ - pad, b.minZ + inset, SKIRT_SEGS_CROSS, SKIRT_SEGS_CROSS),
    buildSkirtStrip(b.minX - pad, b.minX + inset, b.maxZ - inset, b.maxZ + pad, SKIRT_SEGS_CROSS, SKIRT_SEGS_CROSS),
    buildSkirtStrip(b.maxX - inset, b.maxX + pad, b.maxZ - inset, b.maxZ + pad, SKIRT_SEGS_CROSS, SKIRT_SEGS_CROSS),
  ];
}

/** Soft painted sky — cool overcast basin sky, warm horizon haze (not flat grey). */
function makeSkyDomeTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Vertical sky gradient (v=0 top, v=1 bottom of canvas → mapped on sphere)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#c5d4de");
  sky.addColorStop(0.35, "#aebcc6");
  sky.addColorStop(0.58, "#9eb0b8");
  sky.addColorStop(0.72, "#a8b4a8");
  sky.addColorStop(0.82, "#8a9a78");
  sky.addColorStop(0.92, "#6e7e5c");
  sky.addColorStop(1, "#5a6a4e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft distant ridge silhouettes along the horizon band
  ctx.fillStyle = "rgba(70, 82, 64, 0.55)";
  for (let i = 0; i < 18; i++) {
    const hx = (i / 18) * w + hash2(i, 3) * 40;
    const hy = h * (0.7 + hash2(i, 9) * 0.08);
    const hw = 28 + hash2(i, 11) * 50;
    const hh = 10 + hash2(i, 13) * 22;
    ctx.beginPath();
    ctx.moveTo(hx - hw, hy + hh);
    ctx.quadraticCurveTo(hx - hw * 0.3, hy - hh * 0.2, hx, hy - hh);
    ctx.quadraticCurveTo(hx + hw * 0.35, hy - hh * 0.15, hx + hw, hy + hh);
    ctx.closePath();
    ctx.fill();
  }

  // Forest stipple just above the land band
  ctx.fillStyle = "rgba(55, 68, 48, 0.35)";
  for (let i = 0; i < 80; i++) {
    const px = hash2(i, 21) * w;
    const py = h * (0.74 + hash2(i, 23) * 0.1);
    const r = 2 + hash2(i, 25) * 5;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.7, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

type Foothill = {
  x: number;
  z: number;
  y: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
  kind: 0 | 1 | 2;
};

function buildFoothills(): Foothill[] {
  const b = PALE_HOLLOW_BOUNDS;
  const out: Foothill[] = [];
  const ring = [
    // West ridge
    ...Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const z = b.minZ + t * (b.maxZ - b.minZ);
      const x = b.minX - 18 - hash2(i, 1) * 28;
      return { x, z };
    }),
    // East ridge
    ...Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const z = b.minZ + t * (b.maxZ - b.minZ);
      const x = b.maxX + 18 + hash2(i, 2) * 28;
      return { x, z };
    }),
    // South basin rim
    ...Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      const x = b.minX + t * (b.maxX - b.minX);
      const z = b.minZ - 14 - hash2(i, 3) * 24;
      return { x, z };
    }),
    // North ash road approaches
    ...Array.from({ length: 10 }, (_, i) => {
      const t = i / 9;
      const x = b.minX + t * (b.maxX - b.minX);
      const z = b.maxZ + 16 + hash2(i, 4) * 26;
      return { x, z };
    }),
  ];

  for (let i = 0; i < ring.length && out.length < FOOTHILL_COUNT; i++) {
    const { x, z } = ring[i]!;
    const h = hash2(i * 3, Math.floor(x) + Math.floor(z));
    const kind = (h < 0.4 ? 0 : h < 0.75 ? 1 : 2) as 0 | 1 | 2;
    const base = skirtHeight(x, z);
    const sy = 4.5 + h * 7.5;
    const sx = 5.5 + h * 6.5;
    out.push({
      x,
      z,
      y: Math.max(0.4, base - 0.6),
      sx,
      sy,
      sz: sx * (0.75 + h * 0.35),
      yaw: h * Math.PI * 2,
      kind,
    });
  }
  return out;
}

function PaleHollowSkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const map = useMemo(() => makeSkyDomeTexture(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    [map],
  );

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.position.copy(camera.position);
  });

  // Camera-locked dome — always fills the void past the terrain rim.
  return (
    <mesh ref={ref} material={mat} renderOrder={-20} frustumCulled={false}>
      <sphereGeometry args={[170, 24, 14]} />
    </mesh>
  );
}

function PaleHollowSkirt() {
  const geos = useMemo(() => buildSkirtStrips(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        fog: true,
        flatShading: false,
      }),
    [],
  );
  return (
    <group>
      {geos.map((geo, i) => (
        <mesh key={`skirt-${i}`} geometry={geo} material={mat} frustumCulled={false} />
      ))}
    </group>
  );
}

function PaleHollowFoothills() {
  const hills = useMemo(() => buildFoothills(), []);
  const coneGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 5), []);
  const moundGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), []);

  const rockMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#8a8478", fog: true }),
    [],
  );
  const chalkMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#9a9488", fog: true }),
    [],
  );
  const forestMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#5a6a48", fog: true }),
    [],
  );

  const rock = useMemo(() => hills.filter((h) => h.kind === 0), [hills]);
  const chalk = useMemo(() => hills.filter((h) => h.kind === 1), [hills]);
  const forest = useMemo(() => hills.filter((h) => h.kind === 2), [hills]);

  const rockMesh = useMemo(() => {
    if (rock.length === 0) return null;
    const mesh = new THREE.InstancedMesh(coneGeo, rockMat, rock.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    rock.forEach((h, i) => {
      q.setFromEuler(new THREE.Euler(0.04, h.yaw, 0.02));
      s.set(h.sx, h.sy, h.sz);
      p.set(h.x, h.y + h.sy * 0.45, h.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, [coneGeo, rockMat, rock]);

  const chalkMesh = useMemo(() => {
    if (chalk.length === 0) return null;
    const mesh = new THREE.InstancedMesh(coneGeo, chalkMat, chalk.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    chalk.forEach((h, i) => {
      q.setFromEuler(new THREE.Euler(-0.03, h.yaw, 0.05));
      s.set(h.sx * 0.9, h.sy * 0.85, h.sz * 0.9);
      p.set(h.x, h.y + h.sy * 0.4, h.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, [coneGeo, chalkMat, chalk]);

  const forestMesh = useMemo(() => {
    if (forest.length === 0) return null;
    const mesh = new THREE.InstancedMesh(moundGeo, forestMat, forest.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    forest.forEach((h, i) => {
      q.setFromEuler(new THREE.Euler(0, h.yaw, 0));
      s.set(h.sx * 1.1, h.sy * 0.55, h.sz * 1.1);
      p.set(h.x, h.y + 0.2, h.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, [moundGeo, forestMat, forest]);

  return (
    <group>
      {rockMesh ? <primitive object={rockMesh} /> : null}
      {chalkMesh ? <primitive object={chalkMesh} /> : null}
      {forestMesh ? <primitive object={forestMesh} /> : null}
    </group>
  );
}

/** Cheap distant world continuation around Pale Hollow — static, outside stream radius. */
export function PaleHollowHorizon() {
  return (
    <group>
      <PaleHollowSkyDome />
      <PaleHollowSkirt />
      <PaleHollowFoothills />
    </group>
  );
}

/**
 * Pale Hollow rivers — Water2-style dual-normal flow on a flat water table.
 * Normals: three.js Water_1/2_M_Normal (MIT).
 * Flat table clears terrain z-fight; draw under billboards so avatars aren't tinted.
 * Water geometry is punched under each PH_BRIDGE_SITES footprint so decks stay continuous.
 */
import {
  paleHollowBridgeDeckY,
  paleHollowInBridgeWaterGap,
  paleHollowRiverCenterX,
  paleHollowTributaryCenterX,
  paleHollowWalkable,
  paleHollowWaterSurfaceY,
  PALE_HOLLOW_WATER_CLEARANCE,
  PH_BRIDGE_DECK_HALF_T,
  PH_RIVER_MAIN,
  PH_RIVER_TRIB,
  type PaleHollowRiverKind,
} from "@bellgrave/config";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { send } from "./net";

const N0 = "/textures/pale-hollow/water-normal-0.jpg";
const N1 = "/textures/pale-hollow/water-normal-1.jpg";

/** Clearance above channel bed so heightfield facets never poke through. */
const WATER_CLEARANCE = PALE_HOLLOW_WATER_CLEARANCE;

/**
 * Flat water table filling the channel between bank walls.
 * Quads under bridge footprints are omitted so water never draws through decks.
 * Water Y uses channel-bed surface (not stand/deck height).
 */
function buildRiverRibbon(
  centerX: (z: number) => number,
  z0: number,
  z1: number,
  halfW: number,
  segsZ: number,
  segsX: number,
  river: PaleHollowRiverKind,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const sub: number[] = [];
  const idx: number[] = [];

  for (let iz = 0; iz <= segsZ; iz++) {
    const tz = iz / segsZ;
    const z = z0 + (z1 - z0) * tz;
    const cx = centerX(z);
    // Perpendicular to the local tangent so bends fill bank-to-bank, not a world-X strip.
    const eps = 0.85;
    const tx = centerX(z + eps) - centerX(z - eps);
    const tzTan = eps * 2;
    const tLen = Math.hypot(tx, tzTan) || 1;
    // (tz, -tx): station × across points up. The opposite perpendicular faced every
    // triangle down, so FrontSide culled the whole ribbon.
    const px = tzTan / tLen;
    const pz = -tx / tLen;
    // Bed-based water table — never paleHollowHeight (that elevates to deckY on bridges)
    const sampled = paleHollowWaterSurfaceY(cx, z);
    const waterY = sampled != null && Number.isFinite(sampled) ? sampled : WATER_CLEARANCE;

    for (let ix = 0; ix <= segsX; ix++) {
      const txu = ix / segsX;
      const off = (txu - 0.5) * 2 * halfW;
      const x = cx + px * off;
      const zz = z + pz * off;
      // Soft lip near banks; punched bridge cells are dropped from the index below
      const edge = Math.abs(txu - 0.5) * 2;
      const shore = 1 - Math.max(0, Math.min(1, (edge - 0.88) / 0.12));
      const smooth = shore * shore * (3 - 2 * shore);
      pos.push(
        Number.isFinite(x) ? x : cx,
        waterY,
        Number.isFinite(zz) ? zz : z,
      );
      uv.push(txu, tz * ((z1 - z0) / 18));
      sub.push(Math.max(0.72, smooth));
    }
  }

  const stride = segsX + 1;
  const clipsDeck = (vi: number) => {
    const x = pos[vi * 3]!;
    const y = pos[vi * 3 + 1]!;
    const z = pos[vi * 3 + 2]!;
    if (!paleHollowInBridgeWaterGap(x, z, river)) return false;
    const deck = paleHollowBridgeDeckY(x, z);
    if (deck == null) return false;
    // Keep the channel full under the arch; drop a quad only if it would cut the slab.
    return y > deck - PH_BRIDGE_DECK_HALF_T - 0.2;
  };

  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iz * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      if (clipsDeck(a) || clipsDeck(b) || clipsDeck(c) || clipsDeck(d)) continue;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aSub", new THREE.Float32BufferAttribute(sub, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Semicircular water inside a cul-de-sac. Radius matches the ribbon so it meets the end edge. */
function buildCuldesacWater(
  centerX: (z: number) => number,
  zEnd: number,
  halfW: number,
  outward: 1 | -1,
): THREE.BufferGeometry {
  const eps = 0.85;
  const tx = centerX(zEnd + eps) - centerX(zEnd - eps);
  const tzTan = eps * 2;
  const tLen = Math.hypot(tx, tzTan) || 1;
  const ax = tzTan / tLen;
  const az = -tx / tLen;
  const ox = (tx / tLen) * outward;
  const oz = (tzTan / tLen) * outward;
  const cx = centerX(zEnd);
  const sampled = paleHollowWaterSurfaceY(cx, zEnd);
  const waterY = sampled != null && Number.isFinite(sampled) ? sampled : WATER_CLEARANCE;
  const n = Math.max(10, Math.round((Math.PI * halfW) / 0.7));
  const pos: number[] = [cx, waterY, zEnd];
  const uv: number[] = [0.5, 0.5];
  const sub: number[] = [1];
  for (let i = 0; i <= n; i++) {
    const theta = (Math.PI * i) / n;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const x = cx + halfW * (c * ax + s * ox);
    const zz = zEnd + halfW * (c * az + s * oz);
    pos.push(Number.isFinite(x) ? x : cx, waterY, Number.isFinite(zz) ? zz : zEnd);
    uv.push(0.5, 0.5);
    sub.push(1);
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(0, i + 1, i + 2);
  const ax0 = pos[3]! - pos[0]!;
  const az0 = pos[5]! - pos[2]!;
  const bx = pos[6]! - pos[0]!;
  const bz = pos[8]! - pos[2]!;
  const ny = az0 * bx - ax0 * bz;
  if (ny < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]!;
      idx[i + 1] = idx[i + 2]!;
      idx[i + 2] = t;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aSub", new THREE.Float32BufferAttribute(sub, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeRiverMaterial(n0: THREE.Texture, n1: THREE.Texture, tint: THREE.Color): THREE.ShaderMaterial {
  n0.wrapS = n0.wrapT = THREE.RepeatWrapping;
  n1.wrapS = n1.wrapT = THREE.RepeatWrapping;
  n0.needsUpdate = true;
  n1.needsUpdate = true;
  return new THREE.ShaderMaterial({
    uniforms: {
      tNormal0: { value: n0 },
      tNormal1: { value: n1 },
      uTime: { value: 0 },
      uFlow: { value: new THREE.Vector2(0.015, 0.035) },
      uTint: { value: tint },
      uScale: { value: 0.1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: true,
    // Mild offset only — aggressive negative offset was helping water cover decks
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: /* glsl */ `
      attribute float aSub;
      varying vec2 vUv;
      varying vec3 vWorldP;
      varying vec3 vWorldN;
      varying float vSub;
      void main() {
        vUv = uv;
        vSub = aSub;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldP = wp.xyz;
        vWorldN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tNormal0, tNormal1;
      uniform float uTime;
      uniform vec2 uFlow;
      uniform vec3 uTint;
      uniform float uScale;
      varying vec2 vUv;
      varying vec3 vWorldP;
      varying vec3 vWorldN;
      varying float vSub;

      void main() {
        float edge = abs(vUv.x - 0.5) * 2.0;
        // Soft lip only at the wall face — keep the channel filled wall-to-wall
        float shore = 1.0 - smoothstep(0.985, 1.02, edge);
        float sub = smoothstep(0.02, 0.28, vSub);
        float cover = max(shore * sub, 0.78 * (1.0 - smoothstep(0.96, 1.0, edge)));
        if (cover < 0.04) discard;

        vec2 flowA = vWorldP.xz * uScale + uFlow * uTime;
        vec2 flowB = vWorldP.xz * uScale * 1.2 - uFlow.yx * uTime * 0.9 + vec2(0.37, 0.11);
        vec3 nA = texture2D(tNormal0, flowA).xyz * 2.0 - 1.0;
        vec3 nB = texture2D(tNormal1, flowB).xyz * 2.0 - 1.0;
        vec3 nFlow = normalize(nA + nB);

        float foamMask = smoothstep(0.82, 0.96, edge) * (1.0 - smoothstep(0.97, 1.0, edge));
        foamMask *= 0.2 + 0.12 * sin(vWorldP.x * 2.8 + uTime * 2.0);
        foamMask *= sub;

        vec3 N = normalize(normalize(vWorldN) + nFlow * 0.4);
        float ndl = 0.55 + 0.45 * max(dot(N, normalize(vec3(0.4, 1.0, 0.2))), 0.0);
        float fres = pow(1.0 - clamp(N.y, 0.0, 1.0), 2.0);

        vec3 deep = uTint * vec3(0.7, 0.88, 1.05);
        vec3 shallow = uTint * vec3(1.05, 1.15, 1.12);
        vec3 col = mix(deep, shallow, cover * 0.35 + fres * 0.15);
        col += vec3(0.3, 0.45, 0.55) * fres * 0.15;
        float spec = pow(max(dot(N, normalize(vec3(0.3, 1.0, 0.4))), 0.0), 48.0);
        col += vec3(0.65, 0.8, 0.95) * spec * 0.3;
        // Soft water-edge tint only — no bright chalk/white foam rim
        col = mix(col, uTint * vec3(0.95, 1.02, 1.08), foamMask * 0.12);
        col *= ndl;

        float alpha = cover * 0.9 + foamMask * 0.02;
        alpha = clamp(alpha, 0.48, 0.94);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function RiverMesh({
  centerX,
  z0,
  z1,
  halfW,
  segsZ,
  tint,
  flowX,
  flowY,
  river,
}: {
  centerX: (z: number) => number;
  z0: number;
  z1: number;
  halfW: number;
  segsZ: number;
  tint: string;
  flowX: number;
  flowY: number;
  river: PaleHollowRiverKind;
}) {
  const n0 = useTexture(N0);
  const n1 = useTexture(N1);
  const geo = useMemo(
    () => buildRiverRibbon(centerX, z0, z1, halfW, segsZ, 10, river),
    [centerX, z0, z1, halfW, segsZ, river],
  );
  const caps = useMemo(
    () => [buildCuldesacWater(centerX, z0, halfW, -1), buildCuldesacWater(centerX, z1, halfW, 1)],
    [centerX, z0, z1, halfW],
  );
  const mat = useMemo(() => {
    const m = makeRiverMaterial(n0, n1, new THREE.Color(tint));
    m.uniforms.uFlow.value.set(flowX, flowY);
    return m;
  }, [n0, n1, tint, flowX, flowY]);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh
        geometry={geo}
        material={mat}
        renderOrder={5}
        onClick={(e) => {
          e.stopPropagation();
          if (!paleHollowWalkable(e.point.x, e.point.z)) return;
          send({ type: "move", x: e.point.x, z: e.point.z });
        }}
      />
      {caps.map((cap, i) => (
        <mesh key={i} geometry={cap} material={mat} renderOrder={5} />
      ))}
    </group>
  );
}

/** Chalk run + east tributary — halfW matches bank-wall inner face (+tiny overfill). */
export function PaleHollowRivers() {
  return (
    <group>
      <RiverMesh
        centerX={paleHollowRiverCenterX}
        z0={PH_RIVER_MAIN.z0}
        z1={PH_RIVER_MAIN.z1}
        halfW={PH_RIVER_MAIN.waterHalf}
        segsZ={160}
        tint="#2a5a78"
        flowX={0.014}
        flowY={0.042}
        river="main"
      />
      <RiverMesh
        centerX={paleHollowTributaryCenterX}
        z0={PH_RIVER_TRIB.z0}
        z1={PH_RIVER_TRIB.z1}
        halfW={PH_RIVER_TRIB.waterHalf}
        segsZ={56}
        tint="#2a6070"
        flowX={0.022}
        flowY={-0.03}
        river="tributary"
      />
    </group>
  );
}

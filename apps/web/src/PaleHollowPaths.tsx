/**
 * Packed-dirt corridors and short stone approaches from the scout encampment
 * onto the arched stone bridges. Meshes follow stand height so landings meet the decks.
 */
import {
  paleHollowStandHeight,
  paleHollowTrails,
  PH_TRAIL_STONE_WIDTH,
  PH_TRAIL_WIDTH,
  type PaleHollowTrail,
} from "@bellgrave/config";
import { useMemo } from "react";
import * as THREE from "three";

const LIFT = 0.045;

function trailRibbon(trail: PaleHollowTrail, width: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const half = width * 0.5;
  const pts = trail.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const px = -dz * half;
    const pz = dx * half;
    const yA = paleHollowStandHeight(a.x, a.z) + LIFT;
    const yB = paleHollowStandHeight(b.x, b.z) + LIFT;
    const base = pos.length / 3;
    pos.push(a.x + px, yA, a.z + pz, a.x - px, yA, a.z - pz, b.x + px, yB, b.z + pz, b.x - px, yB, b.z - pz);
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function PaleHollowPaths() {
  const trails = useMemo(() => paleHollowTrails(), []);
  const dirtMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#6b5340",
        roughness: 0.96,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const stoneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8d9798",
        roughness: 0.9,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const geos = useMemo(
    () =>
      trails.map((t) => ({
        id: t.id,
        surface: t.surface,
        geo: trailRibbon(t, t.surface === "stone" ? PH_TRAIL_STONE_WIDTH : PH_TRAIL_WIDTH),
      })),
    [trails],
  );

  return (
    <group>
      {geos.map((t) => (
        <mesh
          key={t.id}
          geometry={t.geo}
          material={t.surface === "stone" ? stoneMat : dirtMat}
          castShadow={false}
          receiveShadow={false}
          renderOrder={2}
        />
      ))}
    </group>
  );
}

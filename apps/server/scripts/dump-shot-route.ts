import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  paleHollowPlaceOnDryLand,
  paleHollowRiverCenterX,
  paleHollowTrails,
  paleHollowTributaryCenterX,
} from "@bellgrave/config";

type Hop = { x: number; z: number; shot?: string };

const trails = paleHollowTrails();
function trail(id: string): Hop[] {
  const t = trails.find((tr) => tr.id === id);
  if (!t) return [];
  const out: Hop[] = [];
  for (const p of t.points) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.z - p.z) >= 7) out.push({ x: p.x, z: p.z });
  }
  const last = t.points[t.points.length - 1];
  if (last) out.push({ x: last.x, z: last.z });
  return out;
}

function dry(x: number, z: number, shot?: string): Hop {
  const p = paleHollowPlaceOnDryLand(x, z, 24);
  return { x: p.x, z: p.z, shot };
}

const route: Hop[] = [
  dry(0, 6, "encampment"),
  dry(-26, -6, "silo"),
  ...trail("camp-to-west-farm"),
  dry(-25.3, 22, "hub-west-farm"),
  ...trail("west-farm-onward"),
  dry(-50, 28, "mountain-shoulder"),
  dry(paleHollowRiverCenterX(16) - 10, 16, "chalk-run-south"),
  ...[...trail("camp-to-west-farm")].reverse(),
  dry(0, 8),
  ...trail("camp-to-east-trib"),
  dry(paleHollowTributaryCenterX(39) + 8, 39, "east-trib-z39"),
  ...[...trail("camp-to-east-trib")].reverse(),
  ...trail("camp-to-north"),
  dry(3.3, 33.4, "hub-north"),
  ...trail("north-to-ashbeam"),
  dry(0.1, 81.2, "ashbeam"),
  ...trail("ashbeam-to-chalkworks"),
  dry(-2.8, 150, "chalkworks"),
  dry(paleHollowTributaryCenterX(155) - 8, 155, "east-trib-z155"),
  dry(-2.8, 150),
  ...trail("chalkworks-to-marches"),
  dry(0.4, 196.3, "marches"),
  ...trail("marches-to-ash-road").filter((_, i) => i % 2 === 0),
  dry(paleHollowRiverCenterX(220) + 10, 220, "chalk-run-north"),
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dir = resolve(root, "tmp/bot-reports");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "shot-route.json"), JSON.stringify(route, null, 2));
console.log(`hops ${route.length} shots ${route.filter((h) => h.shot).length}`);

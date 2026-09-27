import {
  PH_BRIDGE_SITES,
  paleHollowBridgeGeom,
  paleHollowPlaceOnDryLand,
  paleHollowRiverCenterX,
  paleHollowTrails,
  paleHollowTributaryCenterX,
} from "@bellgrave/config";

const trails = paleHollowTrails();
for (const t of trails) {
  if (t.surface !== "dirt") continue;
  console.log(t.id, t.points.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(" | "));
}
for (const s of PH_BRIDGE_SITES) {
  const g = paleHollowBridgeGeom(s);
  console.log(
    "bridge",
    s.id,
    `L ${g.postL.x.toFixed(1)},${g.postL.z.toFixed(1)}`,
    `R ${g.postR.x.toFixed(1)},${g.postR.z.toFixed(1)}`,
    `mid ${((g.postL.x + g.postR.x) / 2).toFixed(1)},${((g.postL.z + g.postR.z) / 2).toFixed(1)}`,
  );
}
const spots = [
  ["silo", -26, -6],
  ["trib39", paleHollowTributaryCenterX(39) + 8, 39],
  ["trib155", paleHollowTributaryCenterX(155) - 8, 155],
  ["chalkS", paleHollowRiverCenterX(16) + 10, 16],
  ["chalkN", paleHollowRiverCenterX(220) - 10, 220],
  ["mtnW", -50, 28],
  ["mtnE", 48, 50],
  ["mtnM", -40, 148],
];
for (const [name, x, z] of spots) {
  const p = paleHollowPlaceOnDryLand(x as number, z as number, 24);
  console.log("spot", name, p.x.toFixed(1), p.z.toFixed(1));
}

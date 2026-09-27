/**
 * Player HUD shows these same world X/Z units.
 *
 * Named Pale Hollow places for edits ("look at x, z"). Bridge crossings are
 * derived from `PH_BRIDGE_SITES` via `paleHollowBridgeGeom` — do not copy
 * crossing x/z here. Corridor anchors are centers of the existing segment
 * and soft-gate rects.
 */
import {
  PH_ASH_ROAD,
  PH_BRIDGE_SITES,
  PH_HUB,
  PH_QUARRY_CUT,
  PH_SEAM_TUNNEL,
  PH_SEGMENT_A,
  PH_SEGMENT_B,
  PH_SEGMENT_C,
  PH_SEGMENT_D,
  PH_TIMBER_BRIDGE,
  paleHollowBridgeGeom,
  type PaleHollowBridgeSite,
} from "./pale-hollow";

export type PaleHollowLandmark = {
  id: string;
  name: string;
  x: number;
  z: number;
  note: string;
};

type XZRect = { minX: number; maxX: number; minZ: number; maxZ: number };

function rectCenter(r: XZRect): { x: number; z: number } {
  return {
    x: (r.minX + r.maxX) / 2,
    z: (r.minZ + r.maxZ) / 2,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Readable labels for known sites. Unknown ids still appear — see PH_BRIDGE_SITES. */
const BRIDGE_NOTES: Record<string, string> = {
  "hub-west-farm": "West farm / clay exit across the chalk run — see PH_BRIDGE_SITES",
  "hub-north": "North corridor out of the encampment — see PH_BRIDGE_SITES",
  "ashbeam-corridor": "Ashbeam Reach corridor crossing — see PH_BRIDGE_SITES",
  "chalkworks-corridor": "Chalkworks corridor crossing — see PH_BRIDGE_SITES",
  "marches-corridor": "Pale Marches corridor crossing — see PH_BRIDGE_SITES",
  "hub-east-trib": "Hub-side east tributary toward meadows — see PH_BRIDGE_SITES",
  "ashbeam-east-trib": "East ashbeam tributary crossing — see PH_BRIDGE_SITES",
};

function bridgeLandmark(site: PaleHollowBridgeSite): PaleHollowLandmark {
  const g = paleHollowBridgeGeom(site);
  return {
    id: site.id,
    name: site.id,
    x: round1(g.x),
    z: round1(g.zWorld),
    note: BRIDGE_NOTES[site.id] ?? `${site.river} crossing — see PH_BRIDGE_SITES`,
  };
}

function staticLandmarks(): PaleHollowLandmark[] {
  const hub = rectCenter(PH_HUB);
  const farms = rectCenter(PH_SEGMENT_A);
  const ashbeam = rectCenter(PH_SEGMENT_B);
  const chalkworks = rectCenter(PH_SEGMENT_C);
  const marches = rectCenter(PH_SEGMENT_D);
  const timber = rectCenter(PH_TIMBER_BRIDGE);
  const quarry = rectCenter(PH_QUARRY_CUT);
  const seam = rectCenter(PH_SEAM_TUNNEL);
  const ashRoad = rectCenter(PH_ASH_ROAD);

  return [
    {
      id: "ph-hub",
      name: "Encampment",
      x: hub.x,
      z: hub.z,
      note: `PH_HUB pad center (scout encampment). floorY ${PH_HUB.floorY}`,
    },
    {
      id: "farms",
      name: "Hollow Steps farms",
      x: farms.x,
      z: farms.z,
      note: "PH_SEGMENT_A center — dustgrain terraces and farm band",
    },
    {
      id: "ashbeam",
      name: "Ashbeam Reach",
      x: ashbeam.x,
      z: ashbeam.z,
      note: "PH_SEGMENT_B center — ashbeam groves in open grassland",
    },
    {
      id: "chalkworks",
      name: "Chalkworks",
      x: chalkworks.x,
      z: chalkworks.z,
      note: "PH_SEGMENT_C center — quarry bowl and chalkworks",
    },
    {
      id: "marches",
      name: "Pale Marches",
      x: marches.x,
      z: marches.z,
      note: "PH_SEGMENT_D center — grass and scrub marches toward Ash Road",
    },
    {
      id: "timber-bridge-gate",
      name: "Timber Bridge gate",
      x: timber.x,
      z: timber.z,
      note: "PH_TIMBER_BRIDGE soft-gate rect center (Hollow Steps outbound)",
    },
    {
      id: "quarry-cut",
      name: "Quarry Cut",
      x: quarry.x,
      z: quarry.z,
      note: "PH_QUARRY_CUT soft-gate rect center",
    },
    {
      id: "seam-tunnel",
      name: "Seam Tunnel",
      x: seam.x,
      z: seam.z,
      note: "PH_SEAM_TUNNEL soft-gate rect center",
    },
    {
      id: "ash-road",
      name: "Ash Road",
      x: ashRoad.x,
      z: ashRoad.z,
      note: "PH_ASH_ROAD rect center (blocked north gate)",
    },
  ];
}

let cached: readonly PaleHollowLandmark[] | null = null;

/** Hub, corridor anchors, and live bridge crossings. Cached after the first call. */
export function paleHollowLandmarks(): readonly PaleHollowLandmark[] {
  if (cached) return cached;
  cached = [...staticLandmarks(), ...PH_BRIDGE_SITES.map(bridgeLandmark)];
  return cached;
}

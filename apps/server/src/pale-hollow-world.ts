import {
  PH_ACTIVE_GATHER_COUNT,
  PH_ALL_MOBS,
  PH_ALL_NODES,
  PH_GATHER_RELOCATE_CHANCE,
  PH_HUB,
  paleHollowHeight,
  paleHollowNodeSpawnPoints,
  type PaleHollowMobDef,
  type PaleHollowNodeDef,
} from "@bellgrave/config";

export type FieldMob = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  spawnX: number;
  spawnZ: number;
  facing: number;
  hp: number;
  maxHp: number;
  level: number;
  archetype: PaleHollowMobDef["archetype"];
  aggro: PaleHollowMobDef["aggro"];
  aggroRange: number;
  linkRange: number;
  drops: string[];
  targetId: string | null;
  alive: boolean;
  respawnAt: number;
  fleeUntil: number;
};

export type FieldNode = PaleHollowNodeDef & {
  readyAt: number;
  /** Which authored spawn-point slot this live node currently occupies. */
  spawnPointId: string;
};

function fromDef(d: PaleHollowMobDef): FieldMob {
  return {
    id: d.id,
    name: d.name,
    x: d.x,
    y: paleHollowHeight(d.x, d.z),
    z: d.z,
    spawnX: d.x,
    spawnZ: d.z,
    facing: Math.PI,
    hp: d.hp,
    maxHp: d.hp,
    level: d.level,
    archetype: d.archetype,
    aggro: d.aggro,
    aggroRange: d.aggroRange,
    linkRange: d.linkRange ?? 0,
    drops: [...d.drops],
    targetId: null,
    alive: true,
    respawnAt: 0,
    fleeUntil: 0,
  };
}

/** @deprecated use createPaleHollowMobs */
export function createSegmentAMobs(): FieldMob[] {
  return createPaleHollowMobs();
}

export function createPaleHollowMobs(): FieldMob[] {
  return PH_ALL_MOBS.map(fromDef);
}

/** @deprecated use createPaleHollowNodes */
export function createSegmentANodes(): FieldNode[] {
  return createPaleHollowNodes();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Live gather nodes: authored PH_ALL_NODES coords are the spawn pool.
 * We activate PH_ACTIVE_GATHER_COUNT of them; gathered nodes may relocate.
 */
export function createPaleHollowNodes(): FieldNode[] {
  const pool = paleHollowNodeSpawnPoints();
  console.log(
    `[pale-hollow] gather spawn pool (${pool.length}):\n` +
      pool.map((p) => `  ${p.id.padEnd(18)} ${p.kind.padEnd(8)} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})  ${p.name}`).join("\n"),
  );

  const count = Math.min(PH_ACTIVE_GATHER_COUNT, PH_ALL_NODES.length);
  const picked = shuffle(PH_ALL_NODES).slice(0, count);
  const nodes: FieldNode[] = picked.map((def, i) => ({
    ...def,
    id: `ph-live-${i}`,
    spawnPointId: def.id,
    readyAt: 0,
  }));

  console.log(
    `[pale-hollow] active gather nodes (${nodes.length}/${pool.length}): ` +
      nodes.map((n) => `${n.id}@${n.spawnPointId}`).join(", "),
  );
  return nodes;
}

/** Move a live node onto a free spawn point (adopts that point's template). */
export function relocateGatherNode(nodes: FieldNode[], node: FieldNode, chance = PH_GATHER_RELOCATE_CHANCE): boolean {
  if (Math.random() > chance) return false;
  const occupied = new Set(nodes.map((n) => n.spawnPointId));
  const candidates = PH_ALL_NODES.filter((s) => !occupied.has(s.id));
  if (candidates.length === 0) return false;
  const next = candidates[Math.floor(Math.random() * candidates.length)]!;
  const prev = node.spawnPointId;
  node.spawnPointId = next.id;
  node.x = next.x;
  node.z = next.z;
  node.name = next.name;
  node.kind = next.kind;
  node.yields = [...next.yields];
  node.interactMs = next.interactMs;
  node.respawnMs = next.respawnMs;
  console.log(`[pale-hollow] gather relocate ${node.id}: ${prev} → ${next.id} (${next.x}, ${next.z}) ${next.name}`);
  return true;
}

export function isInHub(x: number, z: number): boolean {
  return x >= PH_HUB.minX && x <= PH_HUB.maxX && z >= PH_HUB.minZ && z <= PH_HUB.maxZ;
}

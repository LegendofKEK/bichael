import {
  JOBS,
  MAX_LEVEL,
  REST_TICK,
  SWING_BASE_MS,
  TIM_ABILITIES,
  SUBJOB_UNLOCK_LEVEL,
  FREE_STAT_POINTS,
  SKILL_POINTS_PER_LEVEL,
  SKILL_PRESTIGE_CAP,
  SKILL_NODES,
  abilitiesUnlockedDual,
  aggregateSkillBonuses,
  attackFromStats,
  canUnlockSkillNode,
  combinedJobVitals,
  deriveCharacterAttributes,
  defenseFromVit,
  effectiveJobLevel,
  evasionFromAgi,
  critFromAgi,
  freeSkillHubs,
  freeStatsSpent,
  fStr,
  meleeFStr,
  meleeUsesWeaponAttack,
  hitChance,
  initialUnlockedForJob,
  isJobId,
  isClericAbilityId,
  isFighterAbilityId,
  isBattleMageAbilityId,
  isKnightAbilityId,
  isRogueAbilityId,
  isSkillNodeId,
  isSorcererAbilityId,
  isTimAbilityId,
  isTimSpell,
  physicalDamage,
  skillHubForJob,
  skillPointsEarned,
  skillPointsGrantedForLevels,
  skillPointsSpentOnTree,
  subjobLevel,
  swingDelayMs,
  TIM_ABILITY_IDS,
  timSpellDustCost,
  timSpellsForSale,
  weaponTpUnlocked,
  weaponTypeFromTokenId,
  isWeaponTpAbilityId,
  xpToNextLevel,
  type AttrKey,
  type JobId,
  type TimAbilityId,
  type WeaponTpAbilityId,
  jobStatsAtLevel,
} from "@bellgrave/combat";
import {
  ITEM,
  MELEE_RANGE,
  MOB_DEATH_FADE_MS,
  MOB_RESPAWN_MS,
  PH_HUB_NPCS,
  PH_STORAGE_CHEST,
  PH_HUB_SPAWN,
  PLAYER_SPEED,
  PLAYER_SPEED_FLUX,
  TICK_HZ,
  TICK_MS,
  clampPaleHollow,
  paleHollowBiome,
  paleHollowClampMove,
  paleHollowGateSoftLevel,
  paleHollowHeight,
  paleHollowStandHeight,
  paleHollowInBuildingClearing,
  paleHollowInOpenWater,
  paleHollowMoveMul,
  paleHollowPlaceOnDryLand,
  paleHollowWalkable,
} from "@bellgrave/config";
import {
  CATALOG_BY_SLUG,
  aggregateEquipmentStats,
  craftXpToNext,
  emptyCraftSkills,
  emptyEquipment,
  getCraftableItem,
  getItem,
  ownedMatQty,
  pickAffordableMaterials,
  recipeMaterials,
  type CraftSkill,
  type ItemDef,
} from "@bellgrave/items";
import { createPaleHollowMobs, createPaleHollowNodes, relocateGatherNode, type FieldNode } from "./pale-hollow-world";
import {
  mobAutoAttackRoll,
  mobEngageRange,
  mobMpForJob,
  resolveMobJob,
  tryMobJobAbility,
} from "./mob-job-ai";
import type {
  AbilityId,
  Equipment,
  EquipSlot,
  InventorySlot,
  ServerMessage,
  SnapshotMessage,
  UnitSnapshot,
} from "@bellgrave/protocol";
import { emptyBuffs, parseClientMessage } from "@bellgrave/protocol";
import { WebSocketServer, type WebSocket } from "ws";
import {
  clearKnightBuffs,
  resolveKnightAbility,
} from "./knight-abilities";
import { clearRogueBuffs, resolveRogueAbility } from "./rogue-abilities";
import {
  clearFighterBuffs,
  fighterAccBonus,
  fighterAttackMul,
  fighterCritBonus,
  fighterDefenseMul,
  fighterDoubleAttackChance,
  fighterEvaPenalty,
  fighterKillingStorm,
  fighterTpGainMul,
  resolveFighterAbility,
} from "./fighter-abilities";
import { resolveWeaponTpAbility } from "./weapon-tp-abilities";
import { clearSorcererBuffs, resolveSorcererAbility } from "./sorcerer-abilities";
import { clearClericBuffs, absorbHealShield, resolveClericAbility } from "./cleric-abilities";
import {
  absorbStoneskin,
  battleMageEnSpellBonus,
  clearBattleMageBuffs,
  resolveBattleMageAbility,
} from "./battlemage-abilities";
import { playerStance, resolveTimAbility } from "./tim-abilities";

type Player = {
  wallet: string;
  /** Stable character slot id within the account (multi-char). */
  charId: string;
  name: string;
  job: JobId;
  gender: "male" | "female" | "pepeka";
  /** Support job — abilities/stats at floor(mainLevel/2). Sprite stays main. */
  subjob: JobId | null;
  level: number;
  xp: number;
  dust: number;
  claimedStarter: boolean;
  inventory: InventorySlot[];
  equip: Equipment;
  x: number;
  y: number;
  z: number;
  zoneId: string;
  baseMats: Record<string, number>;
  /** Craft skill ranks — keys are CraftSkill. */
  craftSkills: Record<string, { level: number; xp: number }>;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tp: number;
  targetId: string | null;
  moveTo: { x: number; z: number } | null;
  anim: UnitSnapshot["anim"];
  flux: boolean;
  aether: boolean;
  quickenUntil: number;
  slowUntil: number;
  levelUpUntil: number;
  hasteUntil: number;
  hastePct: number;
  moveUntil: number;
  movePct: number;
  overclockUntil: number;
  timeSealUntil: number;
  perpetualUntil: number;
  lastEnfeeble: TimAbilityId | null;
  /** Purchased TIM spells. */
  learned: TimAbilityId[];
  /** Master skill tree unlocked nodes (includes free main hub). */
  skillUnlocked: string[];
  /** Unspent skill-tree points (bank; grant on level-up / echoes, spend on unlock). */
  skillPoints: number;
  /** Prestige points after max level (0–100). */
  skillPrestige: number;
  freeStatPoints: number;
  freeStats: Record<AttrKey, number>;
  /** Knight tank buffs */
  bulwarkUntil: number;
  sentinelUntil: number;
  rampartUntil: number;
  coverUntil: number;
  fealtyUntil: number;
  guardianUntil: number;
  protectUntil: number;
  protectPhysMul: number;
  shellUntil: number;
  shellMagMul: number;
  bulwarkFlashUntil: number;
  enmity: number;
  ghostStepUntil: number;
  backbladeUntil: number;
  killEdgeUntil: number;
  shadowPassUntil: number;
  killingStormUntil: number;
  berserkUntil: number;
  defenderUntil: number;
  aggressorUntil: number;
  restraintUntil: number;
  brazenRushUntil: number;
  warcryUntil: number;
  bloodRageUntil: number;
  fighterRageFlashUntil: number;
  arcaneFloodUntil: number;
  elementalSealUntil: number;
  manaWallUntil: number;
  manawellReady: boolean;
  cascadeUntil: number;
  focalNeveUntil: number;
  lastScElement: import("@bellgrave/combat").SorcererElement | null;
  scCastFlashUntil: number;
  divineSealCharges: number;
  divineSealUntil: number;
  solaceRite: boolean;
  miseryRite: boolean;
  miseryEmpowerUntil: number;
  martyrReadyUntil: number;
  devotionReadyUntil: number;
  asylumUntil: number;
  regenUntil: number;
  regenTick: number;
  reraiseUntil: number;
  healAbsorbUntil: number;
  healAbsorbHp: number;
  sacredLightUntil: number;
  blindUntil: number;
  spellbladeUntil: number;
  spellbladeFlashUntil: number;
  focusWeave: boolean;
  corruptReady: boolean;
  spontaneityReady: boolean;
  lockspellReady: boolean;
  widenReady: boolean;
  enSpellUntil: number;
  enSpellBonus: number;
  phalanxUntil: number;
  phalanxPhysMul: number;
  stoneskinUntil: number;
  stoneskinAbsorb: number;
  refreshUntil: number;
  /** MP restored each second while Refresh is active. */
  refreshTick: number;
  nextSwingAt: number;
  animUntil: number;
  /** Keep walk pose briefly after a waypoint so WASD/net gaps don't flicker idle. */
  walkUntil: number;
  /** Cached unlocked abilities (job + weapon skills). */
  unlockCacheKey: string;
  unlockCache: AbilityId[];
  recasts: Partial<Record<AbilityId, number>>;
  lastLog: string[];
  ws: WebSocket;
};

type Mob = {
  id: string;
  name: string;
  x: number;
  z: number;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tp: number;
  targetId: string | null;
  anim: UnitSnapshot["anim"];
  flux: boolean;
  quickenUntil: number;
  slowUntil: number;
  swingPenalty: number;
  gravityUntil: number;
  gravityPct: number;
  bindUntil: number;
  petrifyUntil: number;
  tdImpactUntil: number;
  stunUntil: number;
  distractUntil: number;
  /** Accuracy penalty while distracted (Distract / Distract II). */
  distractAcc: number;
  frazzleUntil: number;
  addleUntil: number;
  silenceUntil: number;
  paraUntil: number;
  blindUntil: number;
  falseGuardUntil: number;
  sleepUntil: number;
  /** Battle Mage Dia — defense eroded */
  diaUntil: number;
  /** Battle Mage Bio — poison DoT */
  bioUntil: number;
  bioTick: number;
  scImpactUntil: number;
  scImpactElement: import("@bellgrave/combat").SorcererElement | null;
  /** Weapon skill Attack Down */
  atkDownUntil: number;
  atkDownMul: number;
  nextSwingAt: number;
  animUntil: number;
  alive: boolean;
  respawnAt: number;
  /** Unix ms when HP hit 0 — corpse fades then vanishes before respawn timer. */
  deathAt: number;
  /** Home position — respawn here, not at death spot. */
  spawnX: number;
  spawnZ: number;
  y: number;
  aggro: "safe" | "proximity" | "sight" | "sound";
  aggroRange: number;
  linkRange: number;
  fleeUntil: number;
  drops: string[];
  rareDrops: { slug: string; chance: number }[];
  archetype: string;
  /** Player-shared job id — drives AI abilities / engage range / attack curves. */
  job: JobId;
  level: number;
  nextAbilityAt: number;
  atkBuffUntil: number;
  atkBuffMul: number;
  /** Idle wander waypoint (NaN = none). */
  roamTx: number;
  roamTz: number;
  /** Next time we may pick a new roam point / leave pause. */
  roamUntil: number;
  /** Brief stand-still between hops/walks. */
  roamPauseUntil: number;
};

const PORT = Number(process.env.PORT ?? 8787);
const players = new Map<string, Player>();
const walletToPlayer = new Map<string, string>();
/** Per-wallet character roster — live progress objects (same refs as active when online). */
const accountRoster = new Map<string, Map<string, Player>>();
/** Unlimited roster until onchain KEK mint gating. */
let tick = 0;
/** Pale Hollow Segment A field mobs. */
let mobs: Mob[] = spawnSegmentAPack();
let fieldNodes: FieldNode[] = createPaleHollowNodes();

const JOB_MASTER = {
  id: "npc-ph-job-master",
  name: "Job Master",
  x: 3.5,
  z: 2.5,
  facing: -Math.PI / 2,
} as const;

const CHRONOMANCER = {
  id: "npc-ph-chronomancer",
  name: "Chronomancer",
  x: -3.2,
  z: 4.8,
  facing: Math.PI,
} as const;

const NPC_INTERACT_RANGE = 3.5;

function emptyCombatFields() {
  return {
    mp: 40,
    maxMp: 40,
    tp: 0,
    targetId: null as string | null,
    anim: "idle" as const,
    flux: false,
    quickenUntil: 0,
    slowUntil: 0,
    swingPenalty: 0,
    gravityUntil: 0,
    gravityPct: 0,
    bindUntil: 0,
    petrifyUntil: 0,
    tdImpactUntil: 0,
    stunUntil: 0,
    distractUntil: 0,
    distractAcc: 0,
    frazzleUntil: 0,
    addleUntil: 0,
    silenceUntil: 0,
    paraUntil: 0,
    blindUntil: 0,
    falseGuardUntil: 0,
    sleepUntil: 0,
    diaUntil: 0,
    bioUntil: 0,
    bioTick: 0,
    scImpactUntil: 0,
    scImpactElement: null as import("@bellgrave/combat").SorcererElement | null,
    atkDownUntil: 0,
    atkDownMul: 1,
    nextSwingAt: 0,
    animUntil: 0,
    alive: true,
    respawnAt: 0,
    deathAt: 0,
    fleeUntil: 0,
    roamTx: Number.NaN,
    roamTz: Number.NaN,
    roamUntil: 0,
    roamPauseUntil: 0,
  };
}

function spawnFieldMob(
  id: string,
  name: string,
  x: number,
  z: number,
  hp: number,
  opts: {
    aggro: Mob["aggro"];
    aggroRange: number;
    linkRange?: number;
    drops: string[];
    rareDrops?: { slug: string; chance: number }[];
    archetype: string;
    job?: JobId | string;
    level?: number;
  },
): Mob {
  const level = Math.max(1, opts.level ?? 1);
  const job = resolveMobJob(opts.archetype, opts.job as JobId | undefined);
  const mpPool = mobMpForJob(job, level);
  const base = emptyCombatFields();
  return {
    id,
    name,
    x,
    y: paleHollowStandHeight(x, z),
    z,
    spawnX: x,
    spawnZ: z,
    facing: Math.PI,
    hp,
    maxHp: hp,
    ...base,
    mp: mpPool.mp,
    maxMp: mpPool.maxMp,
    aggro: opts.aggro,
    aggroRange: opts.aggroRange,
    linkRange: opts.linkRange ?? 0,
    drops: [...opts.drops],
    rareDrops: [...(opts.rareDrops ?? [])],
    archetype: opts.archetype,
    job,
    level,
    nextAbilityAt: 0,
    atkBuffUntil: 0,
    atkBuffMul: 1,
    roamTx: Number.NaN,
    roamTz: Number.NaN,
    // Stagger first wander so packs don't sync-step
    roamUntil: Date.now() + 400 + Math.floor(Math.random() * 1800),
    roamPauseUntil: 0,
  };
}

function spawnSegmentAPack(): Mob[] {
  return createPaleHollowMobs().map((f) =>
    spawnFieldMob(f.id, f.name, f.spawnX, f.spawnZ, f.maxHp, {
      aggro: f.aggro,
      aggroRange: f.aggroRange,
      linkRange: f.linkRange,
      drops: f.drops,
      rareDrops: f.rareDrops,
      archetype: f.archetype,
      job: f.job,
      level: f.level,
    }),
  );
}

function findMob(id: string | null | undefined): Mob | undefined {
  if (!id) return undefined;
  return mobs.find((m) => m.id === id);
}

function clampToHall(x: number, z: number): { x: number; z: number } {
  return clampPaleHollow(x, z);
}

/** Bounds + walkability (no water / river walls except on bridges). */
function clampPlayerMove(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): { x: number; z: number } {
  return paleHollowClampMove(fromX, fromZ, toX, toZ);
}

function syncUnitY(u: { x: number; y: number; z: number }) {
  u.y = paleHollowStandHeight(u.x, u.z);
}

function pullMobOn(mob: Mob, wallet: string, now: number) {
  if (!mob.alive || now < (mob.fleeUntil ?? 0)) return;
  mob.targetId = wallet;
  mob.roamTx = Number.NaN;
  mob.roamTz = Number.NaN;
  const pl = players.get(wallet);
  if (pl) mob.facing = facingTo(mob.x, mob.z, pl.x, pl.z);
  const link = mob.linkRange ?? 0;
  if (link <= 0) return;
  for (const ally of mobs) {
    if (!ally.alive || ally.id === mob.id) continue;
    if (ally.archetype !== mob.archetype) continue;
    if (ally.targetId) continue;
    if (dist(mob.x, mob.z, ally.x, ally.z) > link) continue;
    ally.targetId = wallet;
    ally.roamTx = Number.NaN;
    ally.roamTz = Number.NaN;
    if (pl) ally.facing = facingTo(ally.x, ally.z, pl.x, pl.z);
  }
}

/** Idle wander near spawn — used by hares always, and by other mobs when not aggroed. */
function tickMobRoam(mob: Mob, now: number, dt: number) {
  if (
    now < mob.stunUntil ||
    now < mob.petrifyUntil ||
    now < mob.bindUntil ||
    now < mob.sleepUntil ||
    now < mob.silenceUntil
  ) {
    mob.anim = "idle";
    return;
  }
  if (now < (mob.roamPauseUntil ?? 0)) {
    mob.anim = "idle";
    return;
  }

  const homeR = mob.aggro === "safe" ? 5.8 : 4.5;
  const homeDist = dist(mob.x, mob.z, mob.spawnX, mob.spawnZ);
  const speed =
    mob.archetype === "dust_hare"
      ? 1.65
      : mob.archetype === "pale_slime"
        ? 0.9
        : mob.archetype === "seam_golem"
          ? 0.75
          : 1.2;

  const pickWaypoint = (towardHome: boolean) => {
    if (towardHome) {
      const dry = paleHollowPlaceOnDryLand(mob.spawnX, mob.spawnZ);
      mob.roamTx = dry.x;
      mob.roamTz = dry.z;
    } else {
      const ang = Math.random() * Math.PI * 2;
      const r = 1.4 + Math.random() * homeR;
      let tx = mob.spawnX + Math.sin(ang) * r;
      let tz = mob.spawnZ + Math.cos(ang) * r;
      const dry = paleHollowPlaceOnDryLand(tx, tz);
      tx = dry.x;
      tz = dry.z;
      if (paleHollowInBuildingClearing(tx, tz) || paleHollowInOpenWater(tx, tz)) {
        const home = paleHollowPlaceOnDryLand(mob.spawnX, mob.spawnZ);
        tx = home.x;
        tz = home.z;
      }
      const c = clampToHall(tx, tz);
      mob.roamTx = c.x;
      mob.roamTz = c.z;
    }
    mob.roamUntil = now + 3500 + Math.floor(Math.random() * 4500);
  };

  const hasWp = Number.isFinite(mob.roamTx) && Number.isFinite(mob.roamTz);
  const atWp = hasWp && dist(mob.x, mob.z, mob.roamTx, mob.roamTz) < 0.55;

  if (homeDist > homeR + 1.8) {
    pickWaypoint(true);
  } else if (!hasWp || atWp || now >= (mob.roamUntil ?? 0)) {
    if (atWp) {
      mob.roamPauseUntil = now + 700 + Math.floor(Math.random() * 2400);
      mob.roamTx = Number.NaN;
      mob.roamTz = Number.NaN;
      mob.anim = "idle";
      return;
    }
    pickWaypoint(false);
  }

  if (!Number.isFinite(mob.roamTx) || !Number.isFinite(mob.roamTz)) {
    mob.anim = "idle";
    return;
  }

  mob.facing = facingTo(mob.x, mob.z, mob.roamTx, mob.roamTz);
  const step = speed * dt;
  const nx = mob.x + Math.sin(mob.facing) * step;
  const nz = mob.z + Math.cos(mob.facing) * step;
  const c = clampPlayerMove(mob.x, mob.z, nx, nz);
  // Don't walk into water, river walls, or buildings while roaming
  if (!paleHollowWalkable(c.x, c.z) || paleHollowInBuildingClearing(c.x, c.z)) {
    pickWaypoint(false);
    mob.anim = "idle";
    return;
  }
  mob.x = c.x;
  mob.z = c.z;
  syncUnitY(mob);
  mob.anim = "walk";
}

function warnSoftGate(p: Player, z: number) {
  const soft = paleHollowGateSoftLevel(z);
  if (soft == null) return;
  if (p.level >= soft) return;
  const stamp = ((p as Player & { gateWarnAt?: Record<string, number> }).gateWarnAt ??= {});
  const key = `gate:${soft}:${Math.floor(z / 4)}`;
  const now = Date.now();
  if ((stamp[key] ?? 0) + 12_000 > now) return;
  stamp[key] = now;
  pushLog(p, `This crossing recommends level ${soft} (you are ${p.level}).`);
}

function matDisplayName(matId: string): string {
  return CATALOG_BY_SLUG[matId]?.name ?? matId.replace(/-/g, " ");
}

/** Track mats for craft math and mirror catalog items into the bag. */
function grantBaseMat(p: Player, matId: string, amount = 1) {
  p.baseMats[matId] = (p.baseMats[matId] ?? 0) + amount;
  const def = CATALOG_BY_SLUG[matId];
  if (def) addItem(p.inventory, def.id, amount);
}

function ensureCraftSkills(p: Player) {
  if (!p.craftSkills || typeof p.craftSkills !== "object") {
    p.craftSkills = emptyCraftSkills();
    return;
  }
  const defaults = emptyCraftSkills();
  for (const [k, v] of Object.entries(defaults)) {
    if (!p.craftSkills[k]) p.craftSkills[k] = { ...v };
  }
}

function setMatAmount(p: Player, slug: string, amount: number) {
  const def = CATALOG_BY_SLUG[slug];
  if (amount <= 0) {
    delete p.baseMats[slug];
    if (def) {
      const row = p.inventory.find((i) => i.tokenId === def.id);
      if (row) {
        const idx = p.inventory.indexOf(row);
        if (idx >= 0) p.inventory.splice(idx, 1);
      }
    }
    return;
  }
  p.baseMats[slug] = amount;
  if (def) {
    const row = p.inventory.find((i) => i.tokenId === def.id);
    if (row) row.amount = amount;
    else p.inventory.push({ tokenId: def.id, amount });
  }
}

function takeMat(p: Player, slug: string, amount: number): boolean {
  const have = ownedMatQty(slug, p.inventory, p.baseMats);
  if (have < amount) return false;
  setMatAmount(p, slug, have - amount);
  return true;
}

function grantCraftXp(p: Player, skill: CraftSkill, amount: number) {
  ensureCraftSkills(p);
  const row = p.craftSkills[skill] ?? { level: 1, xp: 0 };
  row.xp += Math.max(1, amount);
  let guard = 0;
  while (row.xp >= craftXpToNext(row.level) && guard++ < 50) {
    row.xp -= craftXpToNext(row.level);
    row.level += 1;
  }
  p.craftSkills[skill] = row;
}

/** Backfill bag slots for mats granted before inventory mirroring existed. */
function syncBaseMatsToInventory(p: Player) {
  for (const [slug, amount] of Object.entries(p.baseMats ?? {})) {
    if (amount <= 0) continue;
    const def = CATALOG_BY_SLUG[slug];
    if (!def) continue;
    const have = invAmount(p.inventory, def.id);
    if (have < amount) addItem(p.inventory, def.id, amount - have);
  }
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

function facingTo(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

/** Point just inside melee range of the target, along the player→target line. */
function meleeApproach(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  stopDist = MELEE_RANGE * 0.85,
): { x: number; z: number } | null {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const d = Math.hypot(dx, dz);
  if (d <= stopDist) return null;
  return clampPlayerMove(fromX, fromZ, toX - (dx / d) * stopDist, toZ - (dz / d) * stopDist);
}

/** Keep closing on engaged target until in swing range. */
function chaseEngaged(p: Player) {
  const mob = findMob(p.targetId);
  if (!mob || !mob.alive) return;
  const d = dist(p.x, p.z, mob.x, mob.z);
  if (d <= MELEE_RANGE) return;
  const pt = meleeApproach(p.x, p.z, mob.x, mob.z);
  if (pt) p.moveTo = pt;
}

/** How far to look for the next fight after a kill. */
const AUTO_ENGAGE_RANGE = 14;

function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Nearest alive mob — prefers what the player is facing. */
function findNextHostile(p: Player, excludeId?: string): Mob | null {
  let best: Mob | null = null;
  let bestScore = Infinity;
  for (const m of mobs) {
    if (!m.alive || m.id === excludeId) continue;
    const d = dist(p.x, p.z, m.x, m.z);
    if (d > AUTO_ENGAGE_RANGE) continue;
    const toMob = facingTo(p.x, p.z, m.x, m.z);
    const face = Math.abs(angleDelta(toMob, p.facing));
    // In front of you beats a closer mob behind your back.
    const score = d + face * 3;
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** After a kill, keep fighting if another hostiles is nearby. */
function autoEngageNext(p: Player, deadId: string) {
  const next = findNextHostile(p, deadId);
  if (!next) return;
  p.targetId = next.id;
  chaseEngaged(p);
  pushLog(
    p,
    dist(p.x, p.z, next.x, next.z) > MELEE_RANGE
      ? `Engaged ${next.name} — closing in.`
      : `Engaged ${next.name}.`,
  );
}

function pushLog(p: Player, message: string) {
  p.lastLog.push(message);
  if (p.lastLog.length > 40) p.lastLog.shift();
  send(p.ws, { type: "log", message });
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function invAmount(inv: InventorySlot[], tokenId: number): number {
  return inv.find((i) => i.tokenId === tokenId)?.amount ?? 0;
}

function addItem(inv: InventorySlot[], tokenId: number, amount: number) {
  const row = inv.find((i) => i.tokenId === tokenId);
  if (row) row.amount += amount;
  else inv.push({ tokenId, amount });
}

function takeItem(inv: InventorySlot[], tokenId: number, amount: number): boolean {
  const row = inv.find((i) => i.tokenId === tokenId);
  if (!row || row.amount < amount) return false;
  row.amount -= amount;
  if (row.amount <= 0) {
    const idx = inv.indexOf(row);
    inv.splice(idx, 1);
  }
  return true;
}

function playerBuffs(p: Player): UnitSnapshot["buffs"] {
  const now = Date.now();
  return {
    ...emptyBuffs(),
    flux: p.flux,
    aether: p.aether,
    quickenUntil: p.quickenUntil,
    slowUntil: p.slowUntil,
    levelUpUntil: p.levelUpUntil,
    hasteUntil: p.hasteUntil,
    hastePct: now < p.hasteUntil ? p.hastePct : 0,
    moveUntil: p.moveUntil,
    movePct: now < p.moveUntil ? p.movePct : 0,
    timeSealUntil: p.timeSealUntil,
    overclockUntil: p.overclockUntil,
    perpetualUntil: p.perpetualUntil,
    petrifyUntil: 0,
    tdImpactUntil: 0,
    bulwarkUntil: p.bulwarkUntil,
    sentinelUntil: p.sentinelUntil,
    rampartUntil: p.rampartUntil,
    coverUntil: p.coverUntil,
    fealtyUntil: p.fealtyUntil,
    guardianUntil: p.guardianUntil,
    protectUntil: p.protectUntil,
    protectPhysMul: now < p.protectUntil ? p.protectPhysMul : 1,
    shellUntil: p.shellUntil,
    shellMagMul: now < p.shellUntil ? p.shellMagMul : 1,
    bulwarkFlashUntil: p.bulwarkFlashUntil,
    ghostStepUntil: p.ghostStepUntil,
    backbladeUntil: p.backbladeUntil,
    killEdgeUntil: p.killEdgeUntil,
    shadowPassUntil: p.shadowPassUntil,
    killingStormUntil: p.killingStormUntil,
    berserkUntil: p.berserkUntil,
    defenderUntil: p.defenderUntil,
    aggressorUntil: p.aggressorUntil,
    restraintUntil: p.restraintUntil,
    brazenRushUntil: p.brazenRushUntil,
    warcryUntil: p.warcryUntil,
    bloodRageUntil: p.bloodRageUntil,
    fighterRageFlashUntil: p.fighterRageFlashUntil,
    arcaneFloodUntil: p.arcaneFloodUntil,
    elementalSealUntil: p.elementalSealUntil,
    manaWallUntil: p.manaWallUntil,
    manawellReady: p.manawellReady,
    cascadeUntil: p.cascadeUntil,
    focalNeveUntil: p.focalNeveUntil,
    scCastFlashUntil: p.scCastFlashUntil,
    spellbladeUntil: p.spellbladeUntil,
    spellbladeFlashUntil: p.spellbladeFlashUntil,
    focusWeave: p.focusWeave,
    enSpellUntil: p.enSpellUntil,
    phalanxUntil: p.phalanxUntil,
    stoneskinUntil: p.stoneskinUntil,
    refreshUntil: p.refreshUntil,
    sacredLightUntil: p.sacredLightUntil,
    solaceRite: p.solaceRite,
    miseryRite: p.miseryRite,
    divineSealReady: p.divineSealCharges > 0 && now < p.divineSealUntil,
    asylumUntil: p.asylumUntil,
    healAbsorbUntil: p.healAbsorbUntil,
    healAbsorbHp: now < p.healAbsorbUntil ? p.healAbsorbHp : 0,
    regenUntil: p.regenUntil,
  };
}

function mobBuffs(m: Mob): UnitSnapshot["buffs"] {
  const now = Date.now();
  return {
    ...emptyBuffs(),
    quickenUntil: m.quickenUntil,
    slowUntil: m.slowUntil,
    hasteUntil: 0,
    hastePct: 0,
    moveUntil: m.gravityUntil,
    movePct: now < m.gravityUntil ? -m.gravityPct : 0,
    bindUntil: m.bindUntil,
    gravityUntil: m.gravityUntil,
    gravityPct: now < m.gravityUntil ? m.gravityPct : 0,
    petrifyUntil: m.petrifyUntil,
    stunUntil: m.stunUntil,
    tdImpactUntil: m.tdImpactUntil,
    distractUntil: m.distractUntil,
    frazzleUntil: m.frazzleUntil,
    addleUntil: m.addleUntil,
    silenceUntil: m.silenceUntil,
    paraUntil: m.paraUntil,
    blindUntil: m.blindUntil,
    falseGuardUntil: m.falseGuardUntil,
    sleepUntil: m.sleepUntil,
    diaUntil: m.diaUntil,
    bioUntil: m.bioUntil,
    scImpactUntil: m.scImpactUntil,
    atkDownUntil: m.atkDownUntil,
    atkDownMul: now < m.atkDownUntil ? m.atkDownMul : 1,
  };
}

function snapshotFor(p: Player): SnapshotMessage {
  const units: UnitSnapshot[] = [];
  /** Only stream nearby field content — full corridor would flood client. */
  const INTEREST = 72;
  const inInterest = (x: number, z: number) => dist(p.x, p.z, x, z) <= INTEREST;

  for (const pl of players.values()) {
    if (pl.wallet !== p.wallet && !inInterest(pl.x, pl.z)) continue;
    units.push({
      id: pl.wallet,
      kind: "player",
      name: pl.name,
      x: pl.x,
      y: pl.y,
      z: pl.z,
      facing: pl.facing,
      hp: pl.hp,
      maxHp: pl.maxHp,
      mp: pl.mp,
      maxMp: pl.maxMp,
      tp: pl.tp,
      anim: pl.anim,
      animUntil: pl.animUntil,
      targetId: pl.targetId,
      job: pl.job,
      gender: pl.gender ?? "male",
      buffs: playerBuffs(pl),
    });
  }
  // Corpses only while fading — then they vanish until MOB_RESPAWN_MS later.
  for (const mob of mobs) {
    const nowMob = Date.now();
    if (!mob.alive) {
      if (!mob.deathAt || nowMob >= mob.deathAt + MOB_DEATH_FADE_MS) continue;
    }
    // Always include engaged target / self-target even if slightly outside bubble
    const engaged =
      p.targetId === mob.id || mob.targetId === p.wallet;
    if (!engaged && !inInterest(mob.x, mob.z)) continue;
    units.push({
      id: mob.id,
      name: mob.name,
      kind: "mob",
      x: mob.x,
      y: mob.y,
      z: mob.z,
      facing: mob.facing,
      hp: mob.alive ? mob.hp : 0,
      maxHp: mob.maxHp,
      mp: mob.mp,
      maxMp: mob.maxMp,
      tp: mob.tp,
      anim: mob.alive ? mob.anim : "dead",
      animUntil: mob.alive ? mob.animUntil : 0,
      targetId: mob.alive ? mob.targetId : null,
      buffs: mobBuffs(mob),
      archetype: mob.archetype,
      job: mob.job,
      deathAt: mob.alive ? undefined : mob.deathAt,
    });
  }

  const hubNpcs = [
    ...PH_HUB_NPCS,
    {
      id: CHRONOMANCER.id,
      name: CHRONOMANCER.name,
      x: CHRONOMANCER.x,
      z: CHRONOMANCER.z,
      facing: CHRONOMANCER.facing,
      role: "spell_trainer" as const,
    },
  ];
  for (const npc of hubNpcs) {
    if (!inInterest(npc.x, npc.z)) continue;
    units.push({
      id: npc.id,
      kind: "npc",
      name: npc.name,
      x: npc.x,
      y: paleHollowHeight(npc.x, npc.z),
      z: npc.z,
      facing: npc.facing,
      hp: 1,
      maxHp: 1,
      mp: 0,
      maxMp: 0,
      tp: 0,
      anim: "idle",
      animUntil: 0,
      targetId: null,
      buffs: emptyBuffs(),
      npcRole: npc.role,
    });
  }

  const nowSnap = Date.now();
  for (const node of fieldNodes) {
    if (!inInterest(node.x, node.z)) continue;
    const ready = nowSnap >= node.readyAt;
    // Depleted nodes stay hidden until they pop back (often at a new spawn)
    if (!ready) continue;
    units.push({
      id: node.id,
      kind: "npc",
      name: node.name,
      x: node.x,
      y: paleHollowHeight(node.x, node.z),
      z: node.z,
      facing: 0,
      hp: 1,
      maxHp: 1,
      mp: 0,
      maxMp: 0,
      tp: 0,
      anim: "idle",
      animUntil: 0,
      targetId: null,
      buffs: emptyBuffs(),
      gatherNode: true,
      gatherYield: node.yields[0],
    });
  }

  const learned = p.job === "time_mage" || p.subjob === "time_mage" ? p.learned : [];
  const unlockKey = `${p.job}|${p.subjob ?? ""}|${p.level}|${p.equip.main ?? ""}|${learned.length}`;
  if (p.unlockCacheKey !== unlockKey || !p.unlockCache) {
    const jobUnlocked = abilitiesUnlockedDual(p.job, p.level, p.subjob, learned) as AbilityId[];
    const wsUnlocked = weaponTpUnlocked(
      weaponTypeFromTokenId(p.equip.main),
      p.level,
    ) as AbilityId[];
    p.unlockCache = Array.from(new Set<AbilityId>([...jobUnlocked, ...wsUnlocked]));
    p.unlockCacheKey = unlockKey;
  }
  const unlocked = p.unlockCache;
  // Skill hubs only need a check on job change — cheap no-op if already present.
  if (tick % (TICK_HZ * 2) === 0) {
    ensureSkillPointBank(p);
    ensureJobHubs(p);
  }
  syncBaseMatsToInventory(p);
  ensureCraftSkills(p);

  return {
    type: "snapshot",
    tick,
    you: {
      wallet: p.wallet,
      characterId: p.charId,
      name: p.name,
      job: p.job,
      gender: p.gender ?? "male",
      subjob: p.subjob,
      subLevel: p.subjob && p.level >= SUBJOB_UNLOCK_LEVEL ? subjobLevel(p.level) : 0,
      level: p.level,
      xp: p.xp,
      dust: p.dust,
      claimedStarter: p.claimedStarter,
      inventory: p.inventory,
      equip: p.equip,
      baseMats: { ...p.baseMats },
      craftSkills: { ...p.craftSkills },
      zoneId: p.zoneId,
      recasts: { ...p.recasts },
      unlocked,
      learned: learned as AbilityId[],
      skillUnlocked: [...p.skillUnlocked],
      skillPoints: p.skillPoints,
      skillPrestige: p.skillPrestige,
      freeStatPoints: p.freeStatPoints,
      freeStats: { ...p.freeStats },
    },
    units,
    log: p.lastLog.slice(-12),
  };
}

function broadcastSnapshots() {
  for (const p of players.values()) send(p.ws, snapshotFor(p));
}

function ensurePlayer(wallet: string, ws: WebSocket): Player | undefined {
  const id = walletToPlayer.get(wallet);
  if (!id) return undefined;
  const p = players.get(id);
  if (!p) return undefined;
  p.ws = ws;
  if (!Array.isArray(p.learned)) p.learned = [];
  if (!p.charId) p.charId = `c_${wallet.slice(-8)}_${Date.now().toString(36)}`;
  if (p.gender !== "male" && p.gender !== "female" && p.gender !== "pepeka") p.gender = "male";
  if (!Array.isArray(p.unlockCache)) p.unlockCache = [];
  if (typeof p.unlockCacheKey !== "string") p.unlockCacheKey = "";
  if (typeof p.y !== "number") p.y = paleHollowStandHeight(p.x, p.z);
  if (!p.zoneId) p.zoneId = "pale_hollow";
  if (!p.baseMats || typeof p.baseMats !== "object") p.baseMats = {};
  ensureCraftSkills(p);
  p.equip = { ...emptyEquipment(), ...(p.equip ?? {}) };
  ensureSkillPointBank(p);
  registerAccountChar(p);
  return p;
}

function registerAccountChar(p: Player) {
  let slots = accountRoster.get(p.wallet);
  if (!slots) {
    slots = new Map();
    accountRoster.set(p.wallet, slots);
  }
  slots.set(p.charId, p);
}

function accountPreviews(wallet: string): {
  id: string;
  name: string;
  job: JobId;
  level: number;
  gender: "male" | "female" | "pepeka";
}[] {
  const slots = accountRoster.get(wallet);
  if (!slots) return [];
  return [...slots.values()].map((p) => ({
    id: p.charId,
    name: p.name,
    job: p.job,
    level: p.level,
    gender: p.gender ?? "male",
  }));
}

function activateCharacter(wallet: string, charId: string, ws: WebSocket): Player | undefined {
  const slots = accountRoster.get(wallet);
  const p = slots?.get(charId);
  if (!p) return undefined;
  p.ws = ws;
  players.set(wallet, p);
  walletToPlayer.set(wallet, wallet);
  return p;
}

function createPlayer(
  wallet: string,
  name: string,
  ws: WebSocket,
  job: JobId = "time_mage",
  gender: "male" | "female" | "pepeka" = "male",
): Player {
  // Replace only this wallet's live session — other players stay in the world (multiplayer).
  const prev = players.get(wallet);
  if (prev && prev.ws !== ws) {
    try {
      prev.ws.close();
    } catch {
      /* ignore */
    }
  }
  const vitals = combinedJobVitals(job, 1, null);
  const charId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const p: Player = {
    wallet,
    charId,
    name,
    job,
    gender,
    subjob: null,
    level: 1,
    xp: 0,
    dust: 0,
    claimedStarter: false,
    inventory: [],
    equip: emptyEquipment(),
    x: PH_HUB_SPAWN.x,
    y: paleHollowHeight(PH_HUB_SPAWN.x, PH_HUB_SPAWN.z),
    z: PH_HUB_SPAWN.z,
    zoneId: "pale_hollow",
    baseMats: {},
    craftSkills: emptyCraftSkills(),
    facing: PH_HUB_SPAWN.facing,
    hp: vitals.maxHp,
    maxHp: vitals.maxHp,
    mp: vitals.maxMp,
    maxMp: vitals.maxMp,
    tp: 0,
    targetId: null,
    moveTo: null,
    anim: "idle",
    flux: false,
    aether: false,
    quickenUntil: 0,
    slowUntil: 0,
    levelUpUntil: 0,
    hasteUntil: 0,
    hastePct: 0,
    moveUntil: 0,
    movePct: 0,
    overclockUntil: 0,
    timeSealUntil: 0,
    perpetualUntil: 0,
    lastEnfeeble: null,
    learned: [],
    skillUnlocked: initialUnlockedForJob(job),
    skillPoints: skillPointsGrantedForLevels(0, 1),
    skillPrestige: 0,
    freeStatPoints: FREE_STAT_POINTS,
    freeStats: { str: 0, dex: 0, vit: 0, agi: 0, int: 0, mnd: 0 },
    bulwarkUntil: 0,
    sentinelUntil: 0,
    rampartUntil: 0,
    coverUntil: 0,
    fealtyUntil: 0,
    guardianUntil: 0,
    protectUntil: 0,
    protectPhysMul: 1,
    shellUntil: 0,
    shellMagMul: 1,
    bulwarkFlashUntil: 0,
    enmity: 0,
    ghostStepUntil: 0,
    backbladeUntil: 0,
    killEdgeUntil: 0,
    shadowPassUntil: 0,
    killingStormUntil: 0,
    berserkUntil: 0,
    defenderUntil: 0,
    aggressorUntil: 0,
    restraintUntil: 0,
    brazenRushUntil: 0,
    warcryUntil: 0,
    bloodRageUntil: 0,
    fighterRageFlashUntil: 0,
    arcaneFloodUntil: 0,
    elementalSealUntil: 0,
    manaWallUntil: 0,
    manawellReady: false,
    cascadeUntil: 0,
    focalNeveUntil: 0,
    lastScElement: null,
    scCastFlashUntil: 0,
    spellbladeUntil: 0,
    spellbladeFlashUntil: 0,
    focusWeave: false,
    corruptReady: false,
    spontaneityReady: false,
    lockspellReady: false,
    widenReady: false,
    enSpellUntil: 0,
    enSpellBonus: 0,
    phalanxUntil: 0,
    phalanxPhysMul: 1,
    stoneskinUntil: 0,
    stoneskinAbsorb: 0,
    refreshUntil: 0,
    refreshTick: 0,
    divineSealCharges: 0,
    divineSealUntil: 0,
    solaceRite: false,
    miseryRite: false,
    miseryEmpowerUntil: 0,
    martyrReadyUntil: 0,
    devotionReadyUntil: 0,
    asylumUntil: 0,
    regenUntil: 0,
    regenTick: 0,
    reraiseUntil: 0,
    healAbsorbUntil: 0,
    healAbsorbHp: 0,
    sacredLightUntil: 0,
    blindUntil: 0,
    nextSwingAt: 0,
    animUntil: 0,
    walkUntil: 0,
    unlockCacheKey: "",
    unlockCache: [],
    recasts: {},
    lastLog: [`Welcome to Bellgrave, ${name}.`],
    ws,
  };
  registerAccountChar(p);
  players.set(wallet, p);
  walletToPlayer.set(wallet, wallet);
  return p;
}

function playerEquipmentStats(p: Player) {
  return aggregateEquipmentStats(p.equip);
}

/** Recompute max HP/MP from job, skill-tree, and equipped catalog bonuses. */
function syncVitals(p: Player, refill = true) {
  const v = combinedJobVitals(p.job, p.level, p.subjob);
  const tree = aggregateSkillBonuses(p.skillUnlocked);
  const gear = playerEquipmentStats(p);
  p.maxHp = v.maxHp + tree.maxHp + (gear.hp ?? 0);
  p.maxMp = v.maxMp === 0 ? 0 : v.maxMp + tree.maxMp + (gear.mp ?? 0);
  if (refill) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  } else {
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
  }
}

function playerCombatStats(p: Player) {
  const derived = deriveCharacterAttributes(
    p.job,
    p.level,
    p.subjob,
    p.skillUnlocked,
    p.freeStats,
  );
  const gear = playerEquipmentStats(p);
  return {
    str: derived.total.str + (gear.str ?? 0),
    dex: derived.total.dex + (gear.dex ?? 0),
    vit: derived.total.vit + (gear.vit ?? 0),
    agi: derived.total.agi + (gear.agi ?? 0),
    int: derived.total.int + (gear.int ?? 0),
    mnd: derived.total.mnd + (gear.mnd ?? 0),
  };
}

function playerTreeBonuses(p: Player) {
  return aggregateSkillBonuses(p.skillUnlocked);
}

function skillPointsRemaining(p: Player): number {
  ensureSkillPointBank(p);
  return Math.max(0, p.skillPoints);
}

/** Backfill bank for older sessions that only tracked level/spent. */
function ensureSkillPointBank(p: Player) {
  if (typeof p.skillPoints === "number" && Number.isFinite(p.skillPoints)) return;
  const spent = skillPointsSpentOnTree(p.skillUnlocked, p.job, p.subjob);
  p.skillPoints = Math.max(0, skillPointsEarned(p.level, p.skillPrestige) - spent);
}

function grantSkillPoints(p: Player, amount: number) {
  if (amount <= 0) return;
  ensureSkillPointBank(p);
  p.skillPoints += amount;
}

function ensureMainHub(p: Player) {
  ensureJobHubs(p);
}

/** Free heart nodes for main and support. Never removes existing unlocks. */
function ensureJobHubs(p: Player) {
  const need = [skillHubForJob(p.job)];
  if (p.subjob && p.subjob !== p.job) need.push(skillHubForJob(p.subjob));
  for (const hub of need) {
    if (!p.skillUnlocked.includes(hub)) p.skillUnlocked.push(hub);
  }
}

function playerHasJob(p: Player, job: JobId): boolean {
  return p.job === job || p.subjob === job;
}

/** Spend XP into levels; after max, spend XP into skill echoes (extra tree points). */
function tryLevelUp(p: Player) {
  ensureSkillPointBank(p);
  let gained = 0;
  const levelBefore = p.level;
  while (p.level < MAX_LEVEL) {
    const need = xpToNextLevel(p.level);
    if (p.xp < need) break;
    p.xp -= need;
    p.level += 1;
    gained += 1;
  }
  if (gained > 0) {
    grantSkillPoints(p, skillPointsGrantedForLevels(levelBefore, p.level));
    syncVitals(p, true);
    p.levelUpUntil = Date.now() + 2400;
    pushLog(
      p,
      gained === 1
        ? `Level up! You are now level ${p.level} (+${SKILL_POINTS_PER_LEVEL} skill point).`
        : `Level up ×${gained}! You are now level ${p.level} (+${gained * SKILL_POINTS_PER_LEVEL} skill points banked).`,
    );
  }

  let echoes = 0;
  while (p.level >= MAX_LEVEL && p.skillPrestige < SKILL_PRESTIGE_CAP) {
    const need = xpToNextLevel(MAX_LEVEL);
    if (p.xp < need) break;
    p.xp -= need;
    p.skillPrestige += 1;
    grantSkillPoints(p, 1);
    echoes += 1;
  }
  if (echoes > 0) {
    pushLog(
      p,
      echoes === 1
        ? `Skill echo! +1 tree point banked (${p.skillPrestige}/${SKILL_PRESTIGE_CAP}).`
        : `Skill echo ×${echoes}! Tree points banked (${p.skillPrestige}/${SKILL_PRESTIGE_CAP}).`,
    );
  }
}

function rewardMobKill(p: Player, mob: Mob, now: number) {
  if (!mob.alive) return;
  mob.hp = 0;
  mob.alive = false;
  mob.anim = "dead";
  mob.deathAt = now;
  // Fade out, then wait MOB_RESPAWN_MS after vanishing before returning.
  mob.respawnAt = now + MOB_DEATH_FADE_MS + MOB_RESPAWN_MS;
  const wasTarget = p.targetId === mob.id;
  if (wasTarget) p.targetId = null;
  p.dust += 25;
  p.xp += 40;
  tryLevelUp(p);
  const dropNotes: string[] = [];
  for (const mat of mob.drops ?? []) {
    if (Math.random() < 0.65) {
      grantBaseMat(p, mat, 1);
      dropNotes.push(matDisplayName(mat));
    }
  }
  for (const rare of mob.rareDrops ?? []) {
    if (Math.random() < rare.chance) {
      const def = CATALOG_BY_SLUG[rare.slug];
      if (def) {
        addItem(p.inventory, def.id, 1);
        dropNotes.push(def.name);
      } else {
        grantBaseMat(p, rare.slug, 1);
        dropNotes.push(matDisplayName(rare.slug));
      }
    }
  }
  pushLog(
    p,
    dropNotes.length
      ? `${mob.name} defeated. +25 Dust, +40 XP. Loot: ${dropNotes.join(", ")}.`
      : `${mob.name} defeated. +25 Dust, +40 XP.`,
  );
  if (wasTarget) autoEngageNext(p, mob.id);
}

function claimStarter(p: Player) {
  if (p.claimedStarter) {
    pushLog(p, "Starter already claimed.");
    return;
  }
  addItem(p.inventory, ITEM.STAFF_ASHBEAM, 1);
  addItem(p.inventory, ITEM.ROBE_LINEN, 1);
  addItem(p.inventory, ITEM.SWORD_IRON, 1);
  addItem(p.inventory, ITEM.MAIL_IRON, 1);
  addItem(p.inventory, ITEM.POTION, 3);
  p.claimedStarter = true;
  // Default TIM loadout; Job Master can swap to Knight gear
  p.equip.main = ITEM.STAFF_ASHBEAM;
  p.equip.body = ITEM.ROBE_LINEN;
  p.dust += 80;
  pushLog(
    p,
    "Claimed starter: staff, robe, sword, mail, Potion x3, +80 Dust. Speak with the Job Master in the Dwellings.",
  );
}

function stopRest(p: Player, reason?: string) {
  if (p.anim !== "rest") return;
  p.anim = "idle";
  p.animUntil = 0;
  if (reason) pushLog(p, reason);
  else pushLog(p, "You stop resting.");
}

function clearJobBuffs(p: Player) {
  p.flux = false;
  p.aether = false;
  p.hasteUntil = 0;
  p.hastePct = 0;
  p.moveUntil = 0;
  p.movePct = 0;
  p.quickenUntil = 0;
  p.overclockUntil = 0;
  p.timeSealUntil = 0;
  p.perpetualUntil = 0;
  p.lastEnfeeble = null;
  p.recasts = {};
  clearKnightBuffs(p);
  clearRogueBuffs(p);
  clearFighterBuffs(p);
  clearSorcererBuffs(p as import("./sorcerer-abilities").SorcererPlayer);
  clearClericBuffs(p as import("./cleric-abilities").ClericPlayer);
  clearBattleMageBuffs(p);
}

function playerPhysDtMul(p: Player, now: number): number {
  const tree = 1 - playerTreeBonuses(p).physDt;
  // Bulwark — true physical immunity (bypass DT floor)
  if (now < p.bulwarkUntil) return 0;

  // Buff fields apply to whoever carries them (Rampart/Guardian/Protect party)
  let mul = 1;
  if (now < p.sentinelUntil) mul *= 0.5;
  if (now < p.coverUntil) mul *= 0.75;
  if (now < p.rampartUntil) mul *= 0.75;
  if (now < p.guardianUntil) mul *= 0.65;
  if (now < p.protectUntil) mul *= p.protectPhysMul;
  if (now < p.phalanxUntil) mul *= p.phalanxPhysMul;
  return Math.max(0.5, mul * Math.max(0.7, tree));
}

/** Mana Wall — pay remaining damage with MP instead of HP. */
function absorbManaWall(p: Player, now: number, raw: number): { dmg: number; bled: number } {
  if (raw <= 0 || now >= p.manaWallUntil) return { dmg: raw, bled: 0 };
  const bled = Math.min(p.mp, raw);
  p.mp -= bled;
  return { dmg: Math.max(0, raw - bled), bled };
}

function playerWeaponBonus(p: Player): number {
  if (!p.equip.main) return 0;
  return playerEquipmentStats(p).atk ?? 10;
}

function handleAbility(p: Player, id: AbilityId, targetId?: string) {
  const now = Date.now();
  if (isWeaponTpAbilityId(id)) {
    resolveWeaponTpAbility(p, id as WeaponTpAbilityId, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as Player, mob, now);
      },
      dist,
      meleeRange: MELEE_RANGE,
      playerWeaponBonus: (pl) => playerWeaponBonus(pl as Player),
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  // Dispatch by kit ownership — main or support job may grant the ability
  if (isRogueAbilityId(id) && playerHasJob(p, "rogue")) {
    resolveRogueAbility(p, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      allMobs: () => mobs,
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as Player, mob, now);
      },
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  if (isKnightAbilityId(id) && playerHasJob(p, "knight")) {
    resolveKnightAbility(p, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      allMobs: () => mobs,
      allPlayers: () => [...players.values()],
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as Player, mob, now);
      },
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  if (isFighterAbilityId(id) && playerHasJob(p, "fighter")) {
    resolveFighterAbility(p, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      allPlayers: () => [...players.values()],
      dist,
    });
    return;
  }
  if (isSorcererAbilityId(id) && playerHasJob(p, "sorcerer")) {
    resolveSorcererAbility(p as import("./sorcerer-abilities").SorcererPlayer & { wallet: string }, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => (findMob(tid ?? null) ?? null) as import("./sorcerer-abilities").SorcererMob | null,
      allMobs: () => mobs as import("./sorcerer-abilities").SorcererMob[],
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as Player, mob, now);
      },
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  if (isBattleMageAbilityId(id) && playerHasJob(p, "battle_mage")) {
    resolveBattleMageAbility(p, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      allMobs: () => mobs,
      allPlayers: () => [...players.values()],
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as Player, mob, now);
      },
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  if (isClericAbilityId(id) && playerHasJob(p, "cleric")) {
    resolveClericAbility(p as import("./cleric-abilities").ClericPlayer, id, targetId, now, {
      pushLog: (pl, msg) => pushLog(pl as unknown as Player, msg),
      stopRest: (pl, reason) => stopRest(pl as unknown as Player, reason),
      facingTo,
      findMob: (tid) => findMob(tid ?? null) ?? null,
      allMobs: () => mobs,
      allPlayers: () => [...players.values()],
      onMobKill: (pl, m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(pl as unknown as Player, mob, now);
      },
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as unknown as Player),
    });
    return;
  }
  if (isTimAbilityId(id) && playerHasJob(p, "time_mage")) {
    resolveTimAbility(p, id, targetId, mobs, now, {
      pushLog: (msg) => pushLog(p, msg),
      stopRest: (reason) => stopRest(p, reason),
      facingTo,
      onMobKill: (m) => {
        const mob = findMob(m.id);
        if (mob) rewardMobKill(p, mob, now);
      },
      allPlayers: () => [...players.values()],
      dist,
      playerCombatStats: (pl) => playerCombatStats(pl as Player),
    });
    return;
  }
  pushLog(p, "You cannot use that ability.");
}

function handleNpcInteract(p: Player, npcId: string) {
  // Party storage chest — stub until bank/storage inventory ships.
  if (npcId === PH_STORAGE_CHEST.id) {
    const d = dist(p.x, p.z, PH_STORAGE_CHEST.x, PH_STORAGE_CHEST.z);
    if (d > NPC_INTERACT_RANGE) {
      pushLog(p, "Step closer to the storage chest.");
      return;
    }
    p.facing = facingTo(p.x, p.z, PH_STORAGE_CHEST.x, PH_STORAGE_CHEST.z);
    pushLog(p, "Storage — coming soon");
    return;
  }

  if (npcId === JOB_MASTER.id) {
    const d = dist(p.x, p.z, JOB_MASTER.x, JOB_MASTER.z);
    if (d > NPC_INTERACT_RANGE) {
      pushLog(p, "Step closer to the Job Master.");
      return;
    }
    p.facing = facingTo(p.x, p.z, JOB_MASTER.x, JOB_MASTER.z);
    const playable = (Object.keys(JOBS) as JobId[]).filter((j) => JOBS[j].playable);
    const canSub = p.level >= SUBJOB_UNLOCK_LEVEL;
    send(p.ws, {
      type: "npc/dialog",
      npcId: JOB_MASTER.id,
      title: canSub ? "Job Master — Support Job" : "Job Master",
      body: canSub
        ? `Main: ${JOBS[p.job].name} L${p.level}. Pick a support job (effective L${subjobLevel(p.level)}), or change your main below. Sprite stays your main.`
        : `Change your main job. Support jobs unlock at level ${SUBJOB_UNLOCK_LEVEL} and stay available through max level.`,
      jobs: playable,
      subjobMode: canSub,
      subLevel: canSub ? subjobLevel(p.level) : 0,
    });
    return;
  }

  if (npcId === CHRONOMANCER.id) {
    const d = dist(p.x, p.z, CHRONOMANCER.x, CHRONOMANCER.z);
    if (d > NPC_INTERACT_RANGE) {
      pushLog(p, "Step closer to the Chronomancer.");
      return;
    }
    p.facing = facingTo(p.x, p.z, CHRONOMANCER.x, CHRONOMANCER.z);
    const timLv = effectiveJobLevel(p.job, p.level, p.subjob, "time_mage");
    if (timLv <= 0) {
      send(p.ws, {
        type: "npc/dialog",
        npcId: CHRONOMANCER.id,
        title: "Chronomancer",
        body: "I only train Time Mages in chronomancy. Speak with the Job Master if you wish to change jobs.",
        spells: [],
      });
      return;
    }
    const forSale = timSpellsForSale(timLv, p.learned);
    send(p.ws, {
      type: "npc/dialog",
      npcId: CHRONOMANCER.id,
      title: "Chronomancer",
      body:
        p.job === "time_mage"
          ? `Scrolls for a Time Mage of level ${timLv}.`
          : `Support Time Mage scrolls (effective L${timLv}).`,
      spells: forSale.map((id) => ({
        id,
        label: TIM_ABILITIES[id].label,
        cost: timSpellDustCost(id),
        unlockLevel: TIM_ABILITIES[id].unlockLevel,
      })),
    });
    return;
  }

  const hub = PH_HUB_NPCS.find((n) => n.id === npcId);
  if (hub) {
    const d = dist(p.x, p.z, hub.x, hub.z);
    if (d > NPC_INTERACT_RANGE) {
      pushLog(p, `Step closer to ${hub.name}.`);
      return;
    }
    p.facing = facingTo(p.x, p.z, hub.x, hub.z);
    if (hub.role === "job_master") {
      handleNpcInteract(p, JOB_MASTER.id);
      return;
    }
    const bodies: Record<string, string> = {
      guide:
        "This little camp is all we hold for now. North, the Hollow Steps terraces — gather Dustgrain, mind the river slimes.",
      quest_giver:
        "The corridor runs Ashbeam Reach, Chalkworks, then Pale Marches. Soft level signs mark each bridge — underleveled may still pass.",
      crafter:
        "Bring base mats from the field. Synth at my bench — I'll rank your crafts as you work.",
      vendor:
        "Provisions are thin, traveler. Gather Pale Flax in the scrub, River Sand on the clay banks, and Rock Salt flecks on the limestone faces — I do not stock craft mats, only advice.",
    };
    send(p.ws, {
      type: "npc/dialog",
      npcId: hub.id,
      title: hub.name,
      body: bodies[hub.role] ?? "…",
      craftOpen: hub.role === "crafter",
    });
    return;
  }

  pushLog(p, "Nothing happens.");
}

function handleSpellBuy(p: Player, id: AbilityId) {
  const d = dist(p.x, p.z, CHRONOMANCER.x, CHRONOMANCER.z);
  if (d > NPC_INTERACT_RANGE) {
    pushLog(p, "You must speak with the Chronomancer to buy spells.");
    return;
  }
  const timLv = effectiveJobLevel(p.job, p.level, p.subjob, "time_mage");
  if (timLv <= 0) {
    pushLog(p, "Only Time Mages can learn these scrolls.");
    return;
  }
  if (!isTimAbilityId(id) || !isTimSpell(id)) {
    pushLog(p, "That is not a trainable spell.");
    return;
  }
  const def = TIM_ABILITIES[id];
  if (timLv < def.unlockLevel) {
    pushLog(p, `${def.label} requires Time Mage level ${def.unlockLevel}.`);
    return;
  }
  if (p.learned.includes(id)) {
    pushLog(p, `You already know ${def.label}.`);
    return;
  }
  const cost = timSpellDustCost(id);
  if (p.dust < cost) {
    pushLog(p, `Need ${cost} Dust for ${def.label} (you have ${p.dust}).`);
    return;
  }
  p.dust -= cost;
  p.learned.push(id);
  pushLog(p, `Learned ${def.label} (−${cost} Dust).`);
  send(p.ws, snapshotFor(p));
  handleNpcInteract(p, CHRONOMANCER.id);
}

/** Dev/test helper — instant L75 + all TIM spells learned. */
function handleSkillUnlock(p: Player, nodeId: string) {
  ensureMainHub(p);
  if (!isSkillNodeId(nodeId)) {
    pushLog(p, "Unknown skill node.");
    return;
  }
  const unlocked = new Set(p.skillUnlocked);
  if (unlocked.has(nodeId)) {
    pushLog(p, "Already unlocked.");
    return;
  }
  if (!canUnlockSkillNode(nodeId, unlocked)) {
    pushLog(p, "That node is not connected to your path yet.");
    return;
  }
  if (skillPointsRemaining(p) <= 0) {
    pushLog(p, "No skill points left. Level up or earn echoes after max level.");
    return;
  }
  p.skillPoints -= 1;
  p.skillUnlocked.push(nodeId);
  syncVitals(p, false);
  const node = SKILL_NODES[nodeId]!;
  pushLog(
    p,
    `Skill: ${node.label} — ${node.blurb} (${skillPointsRemaining(p)} points left).`,
  );
}

function handleFreeStat(p: Player, attr: AttrKey, delta: 1 | -1 = 1) {
  if (delta === 1) {
    if (p.freeStatPoints <= 0) {
      pushLog(p, "No free attribute points remaining.");
      return;
    }
    p.freeStats[attr] = (p.freeStats[attr] ?? 0) + 1;
  } else {
    if ((p.freeStats[attr] ?? 0) <= 0) {
      pushLog(p, `No free points on ${attr.toUpperCase()} to remove.`);
      return;
    }
    p.freeStats[attr] = (p.freeStats[attr] ?? 0) - 1;
  }
  p.freeStatPoints = Math.max(0, FREE_STAT_POINTS - freeStatsSpent(p.freeStats));
  syncVitals(p, false);
  pushLog(
    p,
    delta === 1
      ? `+1 ${attr.toUpperCase()} (free points left: ${p.freeStatPoints}).`
      : `−1 ${attr.toUpperCase()} (free points left: ${p.freeStatPoints}).`,
  );
}

function handleDebugMaxLevel(p: Player) {
  ensureSkillPointBank(p);
  const from = p.level;
  if (from < MAX_LEVEL) {
    p.level = MAX_LEVEL;
    p.xp = 0;
    grantSkillPoints(p, skillPointsGrantedForLevels(from, MAX_LEVEL));
  }
  syncVitals(p, true);
  p.levelUpUntil = Date.now() + 2400;

  const learnedSet = new Set(p.learned);
  let added = 0;
  for (const id of TIM_ABILITY_IDS) {
    if (!isTimSpell(id)) continue;
    if (learnedSet.has(id)) continue;
    p.learned.push(id);
    learnedSet.add(id);
    added += 1;
  }
  p.dust = Math.max(p.dust, 5000);
  // Leave skillPrestige alone — post-max echoes come from EXP.
  ensureMainHub(p);
  pushLog(
    p,
    from >= MAX_LEVEL
      ? `Debug: already L${MAX_LEVEL}. Learned ${added} new spell scroll(s). Dust ${p.dust}.`
      : `Debug: L${from} → L${MAX_LEVEL}. Learned ${added} spell scroll(s). Dust ${p.dust}.`,
  );
  pushLog(
    p,
    `Skill tree: ${skillPointsRemaining(p)} points banked (${skillPointsEarned(p.level, p.skillPrestige)} lifetime, echoes ${p.skillPrestige}/${SKILL_PRESTIGE_CAP}).`,
  );
  if (p.level >= SUBJOB_UNLOCK_LEVEL) {
    pushLog(
      p,
      `Support job unlocked (L${SUBJOB_UNLOCK_LEVEL}+). Speak with the Job Master to pick one — effective L${subjobLevel(p.level)}.`,
    );
  }
  send(p.ws, snapshotFor(p));
  const nearJm = dist(p.x, p.z, JOB_MASTER.x, JOB_MASTER.z) <= NPC_INTERACT_RANGE;
  if (nearJm && p.level >= SUBJOB_UNLOCK_LEVEL) {
    handleNpcInteract(p, JOB_MASTER.id);
  }
}

function handleJobChange(p: Player, job: JobId) {
  const d = dist(p.x, p.z, JOB_MASTER.x, JOB_MASTER.z);
  if (d > NPC_INTERACT_RANGE) {
    pushLog(p, "You must speak with the Job Master to change jobs.");
    return;
  }
  if (!isJobId(job)) {
    pushLog(p, "Unknown job.");
    return;
  }
  const def = JOBS[job];
  if (!def.playable) {
    pushLog(p, `${def.name} is not ready yet.`);
    return;
  }
  if (p.job === job) {
    pushLog(p, `You are already a ${def.name}.`);
    return;
  }
  stopRest(p);
  clearJobBuffs(p);
  if (p.subjob === job) p.subjob = null;
  // Keep skillUnlocked as-is — main swap never strips nodes; new main heart is granted free.
  p.job = job;
  p.targetId = null;
  // Auto-swap / grant starter loadout for the new job
  if (job === "knight") {
    if (invAmount(p.inventory, ITEM.SWORD_IRON) <= 0) addItem(p.inventory, ITEM.SWORD_IRON, 1);
    if (invAmount(p.inventory, ITEM.MAIL_IRON) <= 0) addItem(p.inventory, ITEM.MAIL_IRON, 1);
    p.equip.main = ITEM.SWORD_IRON;
    p.equip.body = ITEM.MAIL_IRON;
  } else if (job === "rogue") {
    if (invAmount(p.inventory, ITEM.DAGGER_IRON) <= 0) addItem(p.inventory, ITEM.DAGGER_IRON, 1);
    if (invAmount(p.inventory, ITEM.LEATHER_VEST) <= 0) addItem(p.inventory, ITEM.LEATHER_VEST, 1);
    p.equip.main = ITEM.DAGGER_IRON;
    p.equip.body = ITEM.LEATHER_VEST;
  } else if (job === "fighter") {
    if (invAmount(p.inventory, ITEM.GREATSWORD_IRON) <= 0) addItem(p.inventory, ITEM.GREATSWORD_IRON, 1);
    if (invAmount(p.inventory, ITEM.SCALE_HARNESS) <= 0) addItem(p.inventory, ITEM.SCALE_HARNESS, 1);
    p.equip.main = ITEM.GREATSWORD_IRON;
    p.equip.body = ITEM.SCALE_HARNESS;
  } else if (job === "time_mage" || job === "sorcerer" || job === "cleric") {
    if (invAmount(p.inventory, ITEM.STAFF_ASHBEAM) <= 0) addItem(p.inventory, ITEM.STAFF_ASHBEAM, 1);
    if (invAmount(p.inventory, ITEM.ROBE_LINEN) <= 0) addItem(p.inventory, ITEM.ROBE_LINEN, 1);
    p.equip.main = ITEM.STAFF_ASHBEAM;
    p.equip.body = ITEM.ROBE_LINEN;
  } else if (job === "battle_mage") {
    if (invAmount(p.inventory, ITEM.SWORD_IRON) <= 0) addItem(p.inventory, ITEM.SWORD_IRON, 1);
    if (invAmount(p.inventory, ITEM.MAIL_IRON) <= 0) addItem(p.inventory, ITEM.MAIL_IRON, 1);
    p.equip.main = ITEM.SWORD_IRON;
    p.equip.body = ITEM.MAIL_IRON;
  }
  syncVitals(p, true);
  ensureJobHubs(p);
  pushLog(p, `Main job — you are now a ${def.name}.`);
  send(p.ws, snapshotFor(p));
}

function handleSubjob(p: Player, job: JobId | null) {
  const d = dist(p.x, p.z, JOB_MASTER.x, JOB_MASTER.z);
  if (d > NPC_INTERACT_RANGE) {
    pushLog(p, "You must speak with the Job Master to set a support job.");
    return;
  }
  if (p.level < SUBJOB_UNLOCK_LEVEL) {
    pushLog(p, `Support jobs unlock at level ${SUBJOB_UNLOCK_LEVEL}.`);
    return;
  }
  if (job === null) {
    p.subjob = null;
    syncVitals(p, false);
    send(p.ws, snapshotFor(p));
    pushLog(p, "Support job cleared.");
    handleNpcInteract(p, JOB_MASTER.id);
    return;
  }
  if (!isJobId(job)) {
    pushLog(p, "Unknown job.");
    return;
  }
  if (!JOBS[job].playable) {
    pushLog(p, `${JOBS[job].name} is not ready yet.`);
    return;
  }
  if (job === p.job) {
    pushLog(p, "Support job must differ from your main.");
    return;
  }
  p.subjob = job;
  ensureJobHubs(p);
  syncVitals(p, true);
  const subLv = subjobLevel(p.level);
  pushLog(
    p,
    `Support job set — ${JOBS[job].name} L${subLv} (half of main L${p.level}). ${JOBS[job].name} Heart unlocked on the skill tree. Sprite remains ${JOBS[p.job].name}.`,
  );
  send(p.ws, snapshotFor(p));
  handleNpcInteract(p, JOB_MASTER.id);
}

function itemJobKey(job: JobId): string {
  if (job === "time_mage") return "tim";
  if (job === "battle_mage") return "battlemage";
  return job;
}

function canJobEquip(p: Player, def: ItemDef): boolean {
  if (!def.jobRestrict || def.jobRestrict === "all") return true;
  const jobs = new Set(def.jobRestrict);
  return jobs.has(itemJobKey(p.job) as never) || (!!p.subjob && jobs.has(itemJobKey(p.subjob) as never));
}

function handleEquip(p: Player, slot: EquipSlot, tokenId: number | null) {
  if (tokenId === null) {
    p.equip[slot] = null;
    if (slot === "main") {
      p.equip.grip = null;
      p.flux = false;
      p.aether = false;
    }
    syncVitals(p, false);
    pushLog(p, `Unequipped ${slot}.`);
    return;
  }
  if (invAmount(p.inventory, tokenId) <= 0) {
    pushLog(p, "You do not own that item.");
    return;
  }
  const def = getItem(tokenId);
  if (!def || def.kind !== "equipment" || def.slot !== slot) {
    pushLog(p, `That item cannot equip in ${slot}.`);
    return;
  }
  if (!canJobEquip(p, def)) {
    pushLog(p, `${def.name} cannot be equipped by your main or support job.`);
    return;
  }

  const main = slot === "main" ? def : p.equip.main ? getItem(p.equip.main) : undefined;
  if (slot === "sub" && main?.twoHand) {
    pushLog(p, "A two-handed main weapon cannot be used with a sub item.");
    return;
  }
  if (slot === "grip" && !main?.twoHand) {
    pushLog(p, "A grip requires a two-handed main weapon.");
    return;
  }
  if (slot === "main") {
    if (def.twoHand) p.equip.sub = null;
    else p.equip.grip = null;
  }

  p.equip[slot] = tokenId;
  syncVitals(p, false);
  pushLog(p, `Equipped ${def.name} on ${slot}.`);
}

function handleUseItem(p: Player, tokenId: number) {
  if (tokenId !== ITEM.POTION) {
    pushLog(p, "Only potions are usable in MVP.");
    return;
  }
  if (!takeItem(p.inventory, ITEM.POTION, 1)) {
    pushLog(p, "No potions left.");
    return;
  }
  // Mock-chain burn: inventory removal IS the burn for MVP
  const heal = 60;
  p.hp = Math.min(p.maxHp, p.hp + heal);
  pushLog(p, `Potion burned on-chain (mock). Restored ${heal} HP.`);
}

function playerHastePct(p: Player, now: number): number {
  let haste = now < p.hasteUntil ? p.hastePct : 0;
  if (now < p.overclockUntil) haste = Math.min(0.8, haste + 0.15);
  haste += playerTreeBonuses(p).hastePct;
  return Math.min(0.85, haste);
}

function playerMoveSpeed(p: Player, now: number): number {
  let speed = p.flux ? PLAYER_SPEED_FLUX : PLAYER_SPEED;
  if (now < p.moveUntil && p.movePct > 0) {
    speed *= 1 + p.movePct;
  }
  const treeMove = playerTreeBonuses(p).movePct;
  if (treeMove > 0) speed *= 1 + treeMove;
  if (p.zoneId === "pale_hollow") {
    speed *= paleHollowMoveMul(p.x, p.z);
  }
  return speed;
}

function playerSwing(p: Player, now: number) {
  if (p.anim === "rest") return;
  if (p.aether) return;
  const mob = findMob(p.targetId);
  if (!mob || !mob.alive) return;
  const d = dist(p.x, p.z, mob.x, mob.z);
  if (d > MELEE_RANGE) return;
  if (now < p.nextSwingAt) return;

  const haste = playerHastePct(p, now);
  const delay = swingDelayMs(SWING_BASE_MS, haste);
  p.nextSwingAt = now + delay;
  p.facing = facingTo(p.x, p.z, mob.x, mob.z);
  p.anim = "melee";
  // Cover most of the swing window so haste still shows a punch each hit.
  p.animUntil = now + Math.max(160, Math.min(delay * 0.9, 520));

  const stance = playerStance(p);
  const stats = playerCombatStats(p);
  // Time Mage keeps Flux / suppressed swings. Sorcerer and Cleric use a STR
  // staff chip (meleeFStr floors the glance). Other jobs are full melee.
  const physical =
    p.job !== "time_mage" && p.job !== "sorcerer" && p.job !== "cleric";
  let att = attackFromStats(stats, stance, playerWeaponBonus(p), {
    physical: meleeUsesWeaponAttack(p.job),
  });
  const tree = playerTreeBonuses(p);
  att += tree.atk;
  if (physical) {
    att = Math.max(1, Math.floor(att * fighterAttackMul(p, now)));
  }
  const mobStats = jobStatsAtLevel(mob.job, mob.level);
  let def = defenseFromVit(mobStats.vit);
  if (now < mob.diaUntil) def = Math.max(1, Math.floor(def * 0.7));
  let acc = stats.dex + 40 + tree.acc + (playerEquipmentStats(p).acc ?? 0) - (now < mob.distractUntil ? mob.distractAcc : 0);
  if (physical && playerHasJob(p, "fighter")) acc += fighterAccBonus(p, now);
  let eva = evasionFromAgi(mobStats.agi);
  if (now < mob.falseGuardUntil) eva = Math.max(0, eva - 18);
  if (Math.random() > hitChance(acc, eva)) {
    pushLog(p, "You miss.");
    return;
  }
  const backbladeReady = now < p.backbladeUntil;
  const killEdgeReady = now < p.killEdgeUntil;
  const shadowPassReady = now < p.shadowPassUntil;
  const stormReady = playerHasJob(p, "fighter") && fighterKillingStorm(p, now);
  let critChance = physical ? 0.08 : stance === "flux" ? 0.12 : 0.05;
  critChance += critFromAgi(stats.agi);
  if (now < p.perpetualUntil) critChance += 0.05;
  critChance += fighterCritBonus(p, now);
  critChance += tree.crit;
  const crit = backbladeReady || killEdgeReady || stormReady || Math.random() < critChance;
  let dmg = physicalDamage(
    att,
    def,
    meleeFStr(p.job, stats, mobStats.vit, stance),
    crit,
  );
  if (backbladeReady) {
    p.backbladeUntil = 0;
    dmg += Math.floor(stats.dex * 0.6);
  }
  if (killEdgeReady) {
    p.killEdgeUntil = 0;
    p.tp = Math.min(3000, p.tp + 300);
  }
  if (shadowPassReady) {
    p.shadowPassUntil = 0;
    p.enmity = 0;
    for (const m of mobs) {
      if (m.targetId === p.wallet) m.targetId = null;
    }
    let best: Player | null = null;
    let bestD = Infinity;
    for (const ally of players.values()) {
      if (ally.wallet === p.wallet) continue;
      const ad = dist(p.x, p.z, ally.x, ally.z);
      if (ad <= 12 && ad < bestD) {
        best = ally;
        bestD = ad;
      }
    }
    if (best) {
      best.enmity = Math.min(10_000, best.enmity + 500);
      pushLog(p, `Shadow Pass — hate slips to ${best.name}.`);
    }
  }
  if (now < p.perpetualUntil) dmg = Math.floor(dmg * 1.15);
  if (playerHasJob(p, "battle_mage")) {
    dmg += battleMageEnSpellBonus(p, now, playerCombatStats(p).int);
  }
  mob.hp -= dmg;
  if (now < mob.sleepUntil) mob.sleepUntil = 0;
  if (mob.archetype === "dust_hare" && mob.hp > 0) {
    mob.fleeUntil = now + 2800;
    mob.targetId = null;
    mob.roamTx = Number.NaN;
    mob.roamTz = Number.NaN;
    mob.roamPauseUntil = 0;
    // Face the flee direction (away from attacker) so client mirror/hop stay stable.
    mob.facing = facingTo(mob.x, mob.z, p.x, p.z) + Math.PI;
    mob.anim = "walk";
  }
  const tpGain = Math.floor(80 * (playerHasJob(p, "fighter") ? fighterTpGainMul(p, now) : 1));
  p.tp = Math.min(3000, p.tp + tpGain);
  if (physical && (playerHasJob(p, "fighter") || playerHasJob(p, "rogue") || playerHasJob(p, "knight"))) {
    p.enmity = Math.min(10_000, p.enmity + Math.floor(dmg * (playerHasJob(p, "rogue") ? 0.08 : 0.15)));
  }
  let hitNote = crit ? " (Critical!)" : "";
  if (stormReady && crit) hitNote += " (Killing Storm!)";
  if (backbladeReady) hitNote += " (Backblade!)";
  if (killEdgeReady) hitNote += " (Kill Edge!)";
  pushLog(p, `You hit ${mob.name} for ${dmg}${hitNote}.`);

  const doubleChance = playerHasJob(p, "fighter") ? fighterDoubleAttackChance(p, now) : 0;
  if (mob.hp > 0 && doubleChance > 0 && Math.random() < doubleChance) {
    const dmg2 = Math.max(1, Math.floor(dmg * 0.85));
    mob.hp -= dmg2;
    p.tp = Math.min(3000, p.tp + Math.floor(tpGain * 0.6));
    pushLog(p, `Double attack! ${dmg2} on ${mob.name}.`);
  }

  if (mob.hp <= 0) {
    rewardMobKill(p, mob, now);
  }
}

function mobSwing(mob: Mob, now: number) {
  if (!mob.alive) return;
  if (mob.aggro === "safe" || now < (mob.fleeUntil ?? 0)) return;
  if (
    now < mob.stunUntil ||
    now < mob.petrifyUntil ||
    now < mob.bindUntil ||
    now < mob.sleepUntil
  ) {
    mob.anim = "idle";
    mob.targetId = null;
    return;
  }
  // Temporal mute (Silencega) — forget the fight until it wears off.
  if (now < mob.silenceUntil) {
    mob.anim = "idle";
    mob.targetId = null;
    return;
  }

  let nearest: Player | null = null;
  let bestScore = -Infinity;
  for (const p of players.values()) {
    // Ghost Step — invisible to chase / aggro
    if (now < p.ghostStepUntil) continue;
    const d = dist(mob.x, mob.z, p.x, p.z);
    if (d > 16) continue;
    // Prefer current target + high enmity (Knight Provoke/Flash)
    let score = -d + (p.enmity || 0) * 0.02;
    if (mob.targetId === p.wallet) score += 8;
    if (score > bestScore) {
      bestScore = score;
      nearest = p;
    }
  }
  if (!nearest) {
    mob.targetId = null;
    // Leave anim alone — idle roam drives walk/idle when not fighting.
    return;
  }
  mob.targetId = nearest.wallet;
  mob.facing = facingTo(mob.x, mob.z, nearest.x, nearest.z);

  const d = dist(mob.x, mob.z, nearest.x, nearest.z);
  const engage = mobEngageRange(mob.job);
  if (d > engage) {
    if (now >= mob.animUntil) {
      const swingSlow = now < mob.slowUntil ? mob.swingPenalty : 0;
      const grav = now < mob.gravityUntil ? mob.gravityPct : 0;
      const speed = 2.2 * (1 - Math.max(swingSlow, grav));
      const step = (speed * TICK_MS) / 1000;
      const ang = mob.facing;
      mob.x += Math.sin(ang) * step;
      mob.z += Math.cos(ang) * step;
      const c = clampToHall(mob.x, mob.z);
      mob.x = c.x;
      mob.z = c.z;
      syncUnitY(mob);
      mob.anim = "walk";
    }
    return;
  }

  if (now < mob.nextSwingAt) {
    if (now >= mob.animUntil && mob.anim !== "walk") mob.anim = "idle";
    return;
  }
  if (now < mob.paraUntil && Math.random() < 0.35) {
    mob.nextSwingAt = now + 800;
    pushLog(nearest, `${mob.name} seizes up (Paralyze).`);
    return;
  }
  if (now < mob.blindUntil && Math.random() < 0.45) {
    mob.nextSwingAt = now + 900;
    pushLog(nearest, `${mob.name} swings wild (Blind)!`);
    return;
  }
  if (now < nearest.ghostStepUntil) {
    mob.nextSwingAt = now + 900;
    pushLog(nearest, `${mob.name} passes through violet smoke — miss!`);
    return;
  }

  const defStats = playerCombatStats(nearest);
  const vitals = {
    vit: defStats.vit,
    agi: Math.max(0, defStats.agi - fighterEvaPenalty(nearest, now)),
  };

  const applyMobDamage = (rawDmg: number, hitLog: string) => {
    let dmg = rawDmg;
    if (nearest.zoneId === "pale_hollow") {
      const b = paleHollowBiome(mob.x, mob.z);
      if (mob.archetype === "pale_slime" && (b === "river" || b === "riverbank")) {
        dmg = Math.max(1, Math.floor(dmg * 1.25));
      }
      if (mob.archetype === "cliff_adder" && b === "vine_cliff") {
        dmg = Math.max(1, Math.floor(dmg * 1.15));
      }
    }
    dmg = Math.max(0, Math.floor(dmg * playerPhysDtMul(nearest, now)));
    dmg = absorbStoneskin(nearest, now, dmg);
    const beforeShield = nearest.healAbsorbHp;
    dmg = absorbHealShield(nearest, now, dmg);
    const soaked = Math.max(0, beforeShield - nearest.healAbsorbHp);
    dmg = Math.max(0, Math.floor(dmg * fighterDefenseMul(nearest, now)));
    const wall = absorbManaWall(nearest, now, dmg);
    dmg = wall.dmg;
    if (dmg <= 0) {
      pushLog(
        nearest,
        soaked > 0
          ? `${mob.name}'s blow is swallowed by your Solace shield!`
          : wall.bled > 0
            ? `${mob.name}'s blow bleeds ${wall.bled} MP through Mana Wall!`
            : `${mob.name}'s blow glances off your ward!`,
      );
      return;
    }
    nearest.hp = Math.max(0, nearest.hp - dmg);
    if (nearest.miseryRite) {
      nearest.miseryEmpowerUntil = now + 15_000;
    }
    stopRest(nearest, `${mob.name}'s blow breaks your rest!`);
    const notes: string[] = [];
    if (soaked > 0) notes.push(`${soaked} absorbed`);
    if (wall.bled > 0) notes.push(`${wall.bled} MP`);
    if (now < mob.addleUntil) notes.push("Addled");
    const base = hitLog.endsWith(".") ? hitLog.slice(0, -1) : hitLog;
    pushLog(nearest, notes.length > 0 ? `${base} (${notes.join(", ")}).` : `${base}.`);
  };

  const usedAbility = tryMobJobAbility(mob, {
    now,
    dist: d,
    player: nearest,
    vitals,
    pushLog: (msg) => pushLog(nearest, msg),
    applyPlayerDamage: (raw, note) => applyMobDamage(raw, note),
  });

  if (!usedAbility) {
    const swingSlow = now < mob.slowUntil ? mob.swingPenalty : 0;
    mob.nextSwingAt = now + swingDelayMs(2400, -swingSlow);
    const roll = mobAutoAttackRoll(mob, vitals, now);
    mob.anim = roll.anim;
    mob.animUntil = now + (roll.anim === "cast" ? 560 : 480);
    if (!roll.hit) {
      pushLog(nearest, `${mob.name} misses you.`);
      return;
    }
    const verb =
      roll.anim === "cast" ? `strikes you with magic for ${roll.dmg}` : `hits you for ${roll.dmg}`;
    applyMobDamage(roll.dmg, `${mob.name} ${verb}`);
  }

  if (nearest.hp <= 0) {
    if (now < nearest.reraiseUntil) {
      nearest.reraiseUntil = 0;
      nearest.hp = Math.max(1, Math.floor(nearest.maxHp * 0.25));
      nearest.sacredLightUntil = now + 2200;
      pushLog(nearest, "Ember Vigil — you rise in sacred light!");
    } else {
      nearest.hp = Math.floor(nearest.maxHp * 0.3);
      nearest.x = PH_HUB_SPAWN.x;
      nearest.z = PH_HUB_SPAWN.z;
      syncUnitY(nearest);
      nearest.moveTo = null;
      nearest.targetId = null;
      nearest.flux = false;
      nearest.aether = false;
      pushLog(nearest, "You fall… and wake in the Shard Dwellings.");
    }
  }
}

function tickSim() {
  tick += 1;
  const now = Date.now();
  const dt = TICK_MS / 1000;

  for (const mob of mobs) {
    if (!mob.alive && now >= mob.respawnAt) {
      const idx = mobs.indexOf(mob);
      mobs[idx] = spawnFieldMob(mob.id, mob.name, mob.spawnX, mob.spawnZ, mob.maxHp, {
        aggro: mob.aggro ?? "proximity",
        aggroRange: mob.aggroRange ?? 4,
        linkRange: mob.linkRange ?? 0,
        drops: mob.drops ?? [],
        rareDrops: mob.rareDrops ?? [],
        archetype: mob.archetype ?? "pale_slime",
        job: mob.job,
        level: mob.level,
      });
    }
    if (now >= mob.slowUntil) mob.swingPenalty = 0;
    if (now >= mob.gravityUntil) mob.gravityPct = 0;
    if (mob.alive && now < mob.bioUntil && mob.bioTick > 0 && tick % TICK_HZ === 0) {
      mob.hp = Math.max(0, mob.hp - mob.bioTick);
      if (mob.hp <= 0) {
        let credited: Player | null = null;
        for (const p of players.values()) {
          if (p.targetId === mob.id) {
            credited = p;
            break;
          }
        }
        if (credited) rewardMobKill(credited, mob, now);
        else {
          mob.alive = false;
          mob.anim = "dead";
          mob.deathAt = now;
          mob.respawnAt = now + MOB_DEATH_FADE_MS + MOB_RESPAWN_MS;
          mob.targetId = null;
        }
      }
    }
  }

  for (const p of players.values()) {
    // Catch overcapped XP (e.g. earned before leveling existed)
    tryLevelUp(p);

    // Regain TP while Flux
    if (p.flux && tick % 20 === 0) p.tp = Math.min(3000, p.tp + 5);

    // Auto-close to melee while engaged
    chaseEngaged(p);

    if (p.moveTo) {
      stopRest(p, "You stand and break your rest.");
      const speed = playerMoveSpeed(p, now);
      const dx = p.moveTo.x - p.x;
      const dz = p.moveTo.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) {
        p.moveTo = null;
        syncUnitY(p);
        p.walkUntil = now + 150;
        if (now >= p.animUntil) p.anim = "walk";
      } else {
        const step = Math.min(d, speed * dt);
        const nx = p.x + (dx / d) * step;
        const nz = p.z + (dz / d) * step;
        const c = clampPlayerMove(p.x, p.z, nx, nz);
        // Blocked by water/wall — cancel path instead of skating along the barrier
        if (Math.hypot(c.x - p.x, c.z - p.z) < 1e-4 && !paleHollowWalkable(nx, nz)) {
          p.moveTo = null;
        } else {
          p.x = c.x;
          p.z = c.z;
          // Ignore tiny residual heading noise near the waypoint
          if (d > 0.35) p.facing = facingTo(0, 0, dx, dz);
          p.walkUntil = now + 200;
          // Don't stomp an active swing/cast pose
          if (now >= p.animUntil) p.anim = "walk";
        }
        syncUnitY(p);
      }
    } else if (p.anim === "walk" && now >= p.walkUntil) {
      if (now >= p.animUntil) p.anim = "idle";
    }

    if (p.anim === "rest") {
      // Once per second: recover HP/MP, bleed TP
      if (tick % TICK_HZ === 0) {
        const beforeHp = p.hp;
        const beforeMp = p.mp;
        const tree = playerTreeBonuses(p);
        p.hp = Math.min(p.maxHp, p.hp + REST_TICK.hp + tree.restHp);
        p.mp = Math.min(p.maxMp, p.mp + REST_TICK.mp + tree.restMp);
        p.tp = Math.max(0, p.tp - REST_TICK.tpDrain);
        if (p.hp !== beforeHp || p.mp !== beforeMp) {
          pushLog(
            p,
            `Resting… HP ${p.hp}/${p.maxHp} · MP ${p.mp}/${p.maxMp} · TP ${p.tp}`,
          );
        }
        if (p.hp >= p.maxHp && p.mp >= p.maxMp && p.tp <= 0) {
          stopRest(p, "Fully recovered — you rise.");
        }
      }
    } else if ((p.anim === "melee" || p.anim === "cast") && now >= p.animUntil) {
      p.anim = "idle";
    } else if (tick % TICK_HZ === 0) {
      if (now < p.refreshUntil) {
        const tickMp = Math.max(1, p.refreshTick || 4);
        p.mp = Math.min(p.maxMp, p.mp + tickMp);
      }
      if (now < p.regenUntil && p.regenTick > 0) {
        p.hp = Math.min(p.maxHp, p.hp + p.regenTick);
      }
    }

    playerSwing(p, now);
  }

  // Pale Hollow field AI — safe / proximity / sight / sound + link
  for (const mob of mobs) {
    if (!mob.alive) continue;
    syncUnitY(mob);
    if (now < (mob.fleeUntil ?? 0)) {
      const step = 2.2 * dt;
      const nx = mob.x + Math.sin(mob.facing) * step;
      const nz = mob.z + Math.cos(mob.facing) * step;
      const c = clampPlayerMove(mob.x, mob.z, nx, nz);
      if (!paleHollowWalkable(c.x, c.z) || paleHollowInBuildingClearing(c.x, c.z)) {
        // Nudge off obstacles instead of snapping against bounds each tick.
        mob.facing += (Math.random() > 0.5 ? 1 : -1) * (0.55 + Math.random() * 0.5);
      } else if (Math.hypot(c.x - mob.x, c.z - mob.z) < 1e-4) {
        mob.facing += (Math.random() > 0.5 ? 1 : -1) * 0.8;
      } else {
        mob.x = c.x;
        mob.z = c.z;
        syncUnitY(mob);
      }
      mob.anim = "walk";
      continue;
    }
    if (mob.aggro === "safe") {
      mob.targetId = null;
      tickMobRoam(mob, now, dt);
      continue;
    }
    if (!mob.targetId) {
      let nearest: Player | null = null;
      let best = mob.aggroRange ?? 4;
      for (const pl of players.values()) {
        if (now < pl.ghostStepUntil) continue;
        const d = dist(mob.x, mob.z, pl.x, pl.z);
        if (d > best) continue;
        if (mob.aggro === "sight") {
          const toPl = facingTo(mob.x, mob.z, pl.x, pl.z);
          if (Math.abs(angleDelta(mob.facing, toPl)) > 1.15) continue;
        } else if (mob.aggro === "sound") {
          const noisy =
            pl.anim === "walk" ||
            pl.anim === "melee" ||
            pl.anim === "cast" ||
            !!pl.targetId;
          if (!noisy) continue;
        } else if (mob.aggro !== "proximity") {
          continue;
        }
        best = d;
        nearest = pl;
      }
      if (nearest) {
        pullMobOn(mob, nearest.wallet, now);
      } else {
        tickMobRoam(mob, now, dt);
      }
    }
  }

  for (const mob of mobs) mobSwing(mob, now);
  broadcastSnapshots();
}

function handleGather(p: Player, nodeId: string) {
  const node = fieldNodes.find((n) => n.id === nodeId);
  if (!node) {
    pushLog(p, "Nothing to gather there.");
    return;
  }
  const d = dist(p.x, p.z, node.x, node.z);
  if (d > 3.2) {
    pushLog(p, "Move closer to gather.");
    p.moveTo = clampPlayerMove(p.x, p.z, node.x, node.z);
    return;
  }
  const now = Date.now();
  if (now < node.readyAt) {
    pushLog(p, `${node.name} is depleted — wait for regrowth.`);
    return;
  }
  stopRest(p, "You break rest to gather.");
  p.targetId = null;
  p.moveTo = null;
  p.facing = facingTo(p.x, p.z, node.x, node.z);
  p.anim = "cast";
  p.animUntil = now + Math.min(node.interactMs, 1200);
  const yieldId = node.yields[Math.floor(Math.random() * node.yields.length)] ?? node.yields[0];
  grantBaseMat(p, yieldId, 1);
  node.readyAt = now + node.respawnMs;
  relocateGatherNode(fieldNodes, node);
  pushLog(p, `Got ${matDisplayName(yieldId)} ×1.`);
  send(p.ws, snapshotFor(p));
}

function handleCraft(p: Player, itemId: number) {
  const def = getCraftableItem(itemId);
  if (!def || !def.craftSkill || def.craftLevel == null) {
    pushLog(p, "That cannot be crafted.");
    return;
  }
  ensureCraftSkills(p);
  const skill = def.craftSkill;
  const skillLv = p.craftSkills[skill]?.level ?? 1;
  if (skillLv < def.craftLevel) {
    pushLog(p, `${def.name} needs ${skill} level ${def.craftLevel} (you have ${skillLv}).`);
    return;
  }
  const mats = pickAffordableMaterials(def, p.inventory, p.baseMats);
  if (!mats || mats.length === 0) {
    const preview = recipeMaterials(def);
    if (preview.length === 0) {
      pushLog(p, "Recipe materials unknown.");
      return;
    }
    const need = preview.map((m) => `${m.name} ×${m.qty}`).join(", ");
    pushLog(p, `Need materials: ${need}.`);
    return;
  }
  for (const mat of mats) {
    if (!takeMat(p, mat.slug, mat.qty)) {
      pushLog(p, `Failed to consume ${mat.name}.`);
      return;
    }
  }
  // Intermediate / equipment / consumable → bag; base mats also track ledger.
  if (def.kind === "base") {
    grantBaseMat(p, def.slug, 1);
  } else {
    addItem(p.inventory, def.id, 1);
  }
  const prevLv = p.craftSkills[skill]?.level ?? 1;
  grantCraftXp(p, skill, Math.max(1, def.craftLevel));
  const nextLv = p.craftSkills[skill]?.level ?? prevLv;
  const levelNote = nextLv > prevLv ? ` ${skill} rose to ${nextLv}!` : "";
  pushLog(p, `Crafted ${def.name}.${levelNote}`);
  send(p.ws, snapshotFor(p));
}

function onMessage(ws: WebSocket, data: string) {
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }
  const msg = parseClientMessage(json);
  if (!msg) {
    send(ws, { type: "error", message: "Invalid message" });
    return;
  }

  if (msg.type === "ping") {
    send(ws, { type: "pong", t: msg.t ?? Date.now() });
    return;
  }

  if (msg.type === "auth") {
    const wallet = msg.wallet.toLowerCase();
    (ws as WebSocket & { wallet?: string }).wallet = wallet;

    // Park any live character — keep roster, leave the world until char/enter or char/create.
    // Otherwise tick broadcasts keep pushing snapshots and the create screen auto-enters the old char.
    const live = players.get(wallet);
    if (live) {
      live.ws = ws;
      registerAccountChar(live);
      players.delete(wallet);
    }
    walletToPlayer.delete(wallet);

    const characters = accountPreviews(wallet);
    const primary = characters[0];
    send(ws, {
      type: "auth/ok",
      wallet,
      hasCharacter: characters.length > 0,
      characters,
      character: primary,
    });
    return;
  }

  const wallet = (ws as WebSocket & { wallet?: string }).wallet;
  if (!wallet) {
    send(ws, { type: "error", message: "Authenticate first." });
    return;
  }

  if (msg.type === "char/create") {
    const job = isJobId(msg.job) && JOBS[msg.job].playable ? msg.job : "time_mage";
    const gender =
      msg.gender === "female" ? "female" : msg.gender === "pepeka" ? "pepeka" : "male";
    const p = createPlayer(wallet, msg.name, ws, job, gender);
    pushLog(
      p,
      `${JOBS[job].name} created. Claim starter. At L${SUBJOB_UNLOCK_LEVEL}+ the Job Master sets a support job (half level).`,
    );
    send(ws, snapshotFor(p));
    return;
  }

  if (msg.type === "char/enter") {
    let p: Player | undefined;
    if (msg.characterId) {
      p = activateCharacter(wallet, msg.characterId, ws);
      if (!p) {
        send(ws, { type: "error", message: "Character not found." });
        return;
      }
    } else {
      p = ensurePlayer(wallet, ws);
      if (!p) {
        const slots = accountRoster.get(wallet);
        const first = slots ? [...slots.values()][0] : undefined;
        if (first) p = activateCharacter(wallet, first.charId, ws);
      }
    }
    if (!p) {
      send(ws, { type: "error", message: "Create a character first." });
      return;
    }
    pushLog(p, "Welcome back to the Shard Dwellings.");
    send(p.ws, snapshotFor(p));
    return;
  }

  const p = ensurePlayer(wallet, ws);
  if (!p) {
    send(ws, { type: "error", message: "Create a character first." });
    return;
  }

  switch (msg.type) {
    case "claim/starter":
      claimStarter(p);
      break;
    case "move":
      // Manual move cancels engage so chase doesn't overwrite the click/WASD
      if (p.targetId) p.targetId = null;
      p.moveTo = clampPlayerMove(p.x, p.z, msg.x, msg.z);
      warnSoftGate(p, p.moveTo.z);
      break;
    case "gather":
      handleGather(p, msg.nodeId);
      break;
    case "craft":
      handleCraft(p, msg.itemId);
      break;
    case "engage": {
      const mob = findMob(msg.targetId);
      if (mob && mob.alive) {
        stopRest(p, "You break rest to engage.");
        p.targetId = mob.id;
        pullMobOn(mob, p.wallet, Date.now());
        chaseEngaged(p);
        pushLog(
          p,
          dist(p.x, p.z, mob.x, mob.z) > MELEE_RANGE
            ? `Engaged ${mob.name} — closing in.`
            : `Engaged ${mob.name}.`,
        );
      } else if (msg.targetId === JOB_MASTER.id) {
        handleNpcInteract(p, JOB_MASTER.id);
      } else if (msg.targetId === CHRONOMANCER.id) {
        handleNpcInteract(p, CHRONOMANCER.id);
      }
      break;
    }
    case "disengage":
      p.targetId = null;
      break;
    case "ability":
      handleAbility(p, msg.id, msg.targetId);
      break;
    case "equip":
      handleEquip(p, msg.slot, msg.tokenId);
      break;
    case "item/use":
      stopRest(p);
      handleUseItem(p, msg.tokenId);
      break;
    case "npc/interact":
      handleNpcInteract(p, msg.npcId);
      break;
    case "job/change":
      handleJobChange(p, msg.job);
      break;
    case "job/subjob":
      handleSubjob(p, msg.job);
      break;
    case "spell/buy":
      handleSpellBuy(p, msg.id);
      break;
    case "debug/maxlevel":
      handleDebugMaxLevel(p);
      break;
    case "skill/unlock":
      handleSkillUnlock(p, msg.nodeId);
      break;
    case "skill/freestat":
      handleFreeStat(p, msg.attr, msg.delta === -1 ? -1 : 1);
      break;
    default:
      break;
  }
}

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws) => {
  ws.on("message", (buf) => onMessage(ws, buf.toString()));
  ws.on("close", () => {
    const wallet = (ws as WebSocket & { wallet?: string }).wallet;
    if (!wallet) return;
    const p = players.get(wallet);
    // Drop from the live interest set so peers stop rendering ghosts; roster keeps the char.
    if (p && p.ws === ws) {
      registerAccountChar(p);
      players.delete(wallet);
      walletToPlayer.delete(wallet);
    }
  });
});

setInterval(tickSim, TICK_MS);
console.log(`[bellgrave] game server on ws://localhost:${PORT}`);

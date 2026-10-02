import { z } from "zod";
import { EQUIP_SLOTS, type Equipment } from "@bellgrave/items";
import {
  ALL_ABILITY_IDS,
  JOB_IDS,
  type AbilityId as CombatAbilityId,
  type JobId as CombatJobId,
} from "@bellgrave/combat";

export type AbilityId = CombatAbilityId;
export type JobId = CombatJobId;

export const AbilityId = z.enum(ALL_ABILITY_IDS as unknown as [CombatAbilityId, ...CombatAbilityId[]]);
export const JobId = z.enum(JOB_IDS as unknown as [CombatJobId, ...CombatJobId[]]);

export const EquipSlot = z.enum(EQUIP_SLOTS);
export type EquipSlot = z.infer<typeof EquipSlot>;
export type { Equipment };

export const Vec2Schema = z.object({ x: z.number(), z: z.number() });
export type Vec2 = z.infer<typeof Vec2Schema>;

export const Gender = z.enum(["male", "female", "pepeka"]);
export type Gender = z.infer<typeof Gender>;

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth"), wallet: z.string().min(3) }),
  z.object({
    type: z.literal("char/create"),
    name: z.string().min(2).max(16),
    job: JobId,
    gender: Gender.default("male"),
  }),
  z.object({
    type: z.literal("char/enter"),
    /** Which roster slot to play; omit to enter the last-active character. */
    characterId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal("move"), x: z.number(), z: z.number() }),
  z.object({ type: z.literal("engage"), targetId: z.string() }),
  z.object({ type: z.literal("disengage") }),
  z.object({ type: z.literal("ability"), id: AbilityId, targetId: z.string().optional() }),
  z.object({ type: z.literal("equip"), slot: EquipSlot, tokenId: z.number().nullable() }),
  z.object({ type: z.literal("item/use"), tokenId: z.number() }),
  z.object({ type: z.literal("claim/starter") }),
  /** Change main job (Job Master). Sprite follows main. */
  z.object({ type: z.literal("job/change"), job: JobId }),
  /** Set support job at L10+ (Job Master). Level = floor(main/2). */
  z.object({ type: z.literal("job/subjob"), job: JobId.nullable() }),
  z.object({ type: z.literal("npc/interact"), npcId: z.string() }),
  z.object({ type: z.literal("gather"), nodeId: z.string().min(1).max(64) }),
  /** Synth an item by catalog id (requires mats + craft skill level). */
  z.object({ type: z.literal("craft"), itemId: z.number().int().positive() }),
  z.object({ type: z.literal("spell/buy"), id: AbilityId }),
  /** Dev/test: jump to max job level + learn all TIM spells. */
  z.object({ type: z.literal("debug/maxlevel") }),
  /** Unlock a skill-tree node (must be adjacent; costs 1 point). */
  z.object({ type: z.literal("skill/unlock"), nodeId: z.string().min(1).max(64) }),
  /** Spend or refund one free attribute point (delta +1 / −1). */
  z.object({
    type: z.literal("skill/freestat"),
    attr: z.enum(["str", "dex", "vit", "agi", "int", "mnd"]),
    delta: z.union([z.literal(1), z.literal(-1)]).optional(),
  }),
  /** Keepalive — client ↔ server heartbeat so AFK tabs stay connected. */
  z.object({ type: z.literal("ping"), t: z.number().optional() }),
  /** Invite a player to your party (by wallet / unit id, or exact character name). */
  z.object({ type: z.literal("party/invite"), targetId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("party/accept") }),
  z.object({ type: z.literal("party/decline") }),
  z.object({ type: z.literal("party/leave") }),
  z.object({ type: z.literal("party/kick"), targetId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("party/disband") }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type BuffState = {
  quickenUntil: number;
  slowUntil: number;
  flux: boolean;
  aether: boolean;
  levelUpUntil: number;
  /** Magical haste family (quicken/tempo/allegro/haste/overclock) — highest wins via server. */
  hasteUntil: number;
  hastePct: number;
  moveUntil: number;
  movePct: number;
  bindUntil: number;
  gravityUntil: number;
  gravityPct: number;
  petrifyUntil: number;
  stunUntil: number;
  timeSealUntil: number;
  overclockUntil: number;
  perpetualUntil: number;
  /** Temporal Distortion impact flash (earth + chrona) — short window. */
  tdImpactUntil: number;
  /** Enemy enfeebles (synced for world status icons). */
  distractUntil: number;
  frazzleUntil: number;
  addleUntil: number;
  silenceUntil: number;
  paraUntil: number;
  /** Knight tank buffs / wards */
  bulwarkUntil: number;
  sentinelUntil: number;
  rampartUntil: number;
  coverUntil: number;
  fealtyUntil: number;
  guardianUntil: number;
  protectUntil: number;
  /** Physical damage taken multiplier from Protect line (1 = none). */
  protectPhysMul: number;
  shellUntil: number;
  shellMagMul: number;
  /** Flash blind on mobs */
  blindUntil: number;
  /** Bulwark / Sentinel impact flash on player */
  bulwarkFlashUntil: number;
  /** Rogue evasion / crit buffs */
  ghostStepUntil: number;
  backbladeUntil: number;
  killEdgeUntil: number;
  shadowPassUntil: number;
  /** False Guard — mob guard feinted (lowers evasion vs player swings) */
  falseGuardUntil: number;
  /** Fighter melee buffs */
  killingStormUntil: number;
  berserkUntil: number;
  defenderUntil: number;
  aggressorUntil: number;
  restraintUntil: number;
  brazenRushUntil: number;
  warcryUntil: number;
  bloodRageUntil: number;
  fighterRageFlashUntil: number;
  /** Sorcerer self buffs */
  arcaneFloodUntil: number;
  elementalSealUntil: number;
  manaWallUntil: number;
  manawellReady: boolean;
  cascadeUntil: number;
  focalNeveUntil: number;
  scCastFlashUntil: number;
  /** Sorcerer nuke impact on mobs */
  scImpactUntil: number;
  /** sleep family */
  sleepUntil: number;
  /** Battle Mage Dia / Bio on foes */
  diaUntil: number;
  bioUntil: number;
  /** Weapon skill Attack Down on foes */
  atkDownUntil: number;
  atkDownMul: number;
  /** Battle Mage hybrid buffs */
  spellbladeUntil: number;
  spellbladeFlashUntil: number;
  focusWeave: boolean;
  enSpellUntil: number;
  phalanxUntil: number;
  stoneskinUntil: number;
  refreshUntil: number;
  /** Cleric — white/sky-blue light column VFX */
  sacredLightUntil: number;
  solaceRite: boolean;
  miseryRite: boolean;
  divineSealReady: boolean;
  asylumUntil: number;
  /** Solace Rite cure shield */
  healAbsorbUntil: number;
  healAbsorbHp: number;
  /** Cleric regen */
  regenUntil: number;
};

export type UnitSnapshot = {
  id: string;
  kind: "player" | "mob" | "npc";
  name: string;
  x: number;
  /** Terrain height — outdoor undulates; indoor hubs stay flat. */
  y: number;
  z: number;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  tp: number;
  anim: "idle" | "walk" | "melee" | "cast" | "rest" | "dead";
  /** Unix ms when current anim ends — bumps each swing so clients can replay melee/cast. */
  animUntil: number;
  targetId: string | null;
  buffs: BuffState;
  /** Present on players and field mobs — drives swing SFX / job AI / visuals. */
  job?: JobId;
  /** Present on players — sprite set (male default). */
  gender?: Gender;
  /** Present on NPCs */
  npcRole?: "job_master" | "spell_trainer" | "guide" | "quest_giver" | "crafter" | "vendor";
  /** Field gather marker */
  gatherNode?: boolean;
  /** Primary mat slug for gather billboard icon */
  gatherYield?: string;
  /** Mob sprite set */
  archetype?: string;
  /** Field mob level (nameplates / shiny HQ). */
  level?: number;
  /** Shiny HQ - client sparkle/tint; same sprite as archetype. */
  shiny?: boolean;
  /** Unix ms when this mob died — client fades corpse until MOB_DEATH_FADE_MS. */
  deathAt?: number;
};

export type InventorySlot = { tokenId: number; amount: number };


export type PartyMemberSnapshot = {
  id: string;
  name: string;
  level: number;
  job: JobId;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  online: boolean;
};

export type PartySnapshot = {
  id: string;
  leaderId: string;
  members: PartyMemberSnapshot[];
};

export type PartyInviteSnapshot = {
  fromId: string;
  fromName: string;
  partyId: string;
  expiresAt: number;
};

export type SnapshotMessage = {
  type: "snapshot";
  tick: number;
  you: {
    wallet: string;
    /** Active character slot id (multi-char roster). */
    characterId: string;
    name: string;
    job: JobId;
    gender: Gender;
    /** Support job (L10+). Sprite stays main. null = none. */
    subjob: JobId | null;
    /** Effective support level = floor(main/2). 0 if no subjob. */
    subLevel: number;
    level: number;
    xp: number;
    dust: number;
    claimedStarter: boolean;
    inventory: InventorySlot[];
    equip: Equipment;
    /** Base precursor mats (Pale Hollow gather/drops) — NFT-bound later. */
    baseMats: Record<string, number>;
    /** Craft skill ranks (smithing, cooking, …). */
    craftSkills: Record<string, { level: number; xp: number }>;
    /** Active field zone id. */
    zoneId: string;
    /** AbilityId → ready-at unix ms (Date.now()). Absent / past = ready. */
    recasts: Partial<Record<AbilityId, number>>;
    /** Unlocked ability ids for current job/level (hotbar + spellbook). */
    unlocked: AbilityId[];
    /** Abilities purchased from the Trainer (persists on character). */
    learned: AbilityId[];
    /** Master skill tree — unlocked node ids (includes free main hub). */
    skillUnlocked: string[];
    /** Unspent skill-tree points (banked across levels). */
    skillPoints: number;
    /** Prestige skill points earned after max level (0–100). */
    skillPrestige: number;
    /** Free attribute points remaining (start at 5). */
    freeStatPoints: number;
    /** Allocated free attribute points. */
    freeStats: { str: number; dex: number; vit: number; agi: number; int: number; mnd: number };
  };
  units: UnitSnapshot[];
  log: string[];
  /** Active party — null when solo. */
  party: PartySnapshot | null;
  /** Pending invite for this client (accept/decline). */
  partyInvite: PartyInviteSnapshot | null;
};

export type CharacterPreview = {
  id: string;
  name: string;
  job: JobId;
  level: number;
  gender: Gender;
};

export type SpellOffer = {
  id: AbilityId;
  label: string;
  cost: number;
  unlockLevel: number;
  /** Main job (full level) or support job (half level) offer track. */
  track?: "main" | "support";
};

export type ServerMessage =
  | SnapshotMessage
  | { type: "error"; message: string }
  | {
      type: "auth/ok";
      wallet: string;
      hasCharacter: boolean;
      /** All characters on this account (multi-slot). */
      characters: CharacterPreview[];
      /** Last-active / primary character — convenience for older clients. */
      character?: CharacterPreview;
    }
  | { type: "log"; message: string }
  | { type: "pong"; t?: number }
  | { type: "party/invite"; fromId: string; fromName: string; partyId: string; expiresAt: number }
  | {
      type: "npc/dialog";
      npcId: string;
      title: string;
      body: string;
      jobs?: JobId[];
      /** When true, dialog is picking a support job (not main). */
      subjobMode?: boolean;
      subLevel?: number;
      spells?: SpellOffer[];
      /** Craft Master — client may open the Crafting panel. */
      craftOpen?: boolean;
    };

export function parseClientMessage(raw: unknown): ClientMessage | null {
  const result = ClientMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function emptyBuffs(): BuffState {
  return {
    quickenUntil: 0,
    slowUntil: 0,
    flux: false,
    aether: false,
    levelUpUntil: 0,
    hasteUntil: 0,
    hastePct: 0,
    moveUntil: 0,
    movePct: 0,
    bindUntil: 0,
    gravityUntil: 0,
    gravityPct: 0,
    petrifyUntil: 0,
    stunUntil: 0,
    timeSealUntil: 0,
    overclockUntil: 0,
    perpetualUntil: 0,
    tdImpactUntil: 0,
    distractUntil: 0,
    frazzleUntil: 0,
    addleUntil: 0,
    silenceUntil: 0,
    paraUntil: 0,
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
    blindUntil: 0,
    bulwarkFlashUntil: 0,
    ghostStepUntil: 0,
    backbladeUntil: 0,
    killEdgeUntil: 0,
    shadowPassUntil: 0,
    falseGuardUntil: 0,
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
    scCastFlashUntil: 0,
    scImpactUntil: 0,
    sleepUntil: 0,
    diaUntil: 0,
    bioUntil: 0,
    atkDownUntil: 0,
    atkDownMul: 1,
    spellbladeUntil: 0,
    spellbladeFlashUntil: 0,
    focusWeave: false,
    enSpellUntil: 0,
    phalanxUntil: 0,
    stoneskinUntil: 0,
    refreshUntil: 0,
    sacredLightUntil: 0,
    solaceRite: false,
    miseryRite: false,
    divineSealReady: false,
    asylumUntil: 0,
    healAbsorbUntil: 0,
    healAbsorbHp: 0,
    regenUntil: 0,
  };
}

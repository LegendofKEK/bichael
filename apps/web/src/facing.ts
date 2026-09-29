/**
 * 8-direction sprite facing for isometric player jobs.
 *
 * Authored PNG lateral convention (male TIM is the gold standard):
 * - `-e`  profile faces **screen-right**
 * - `-ne` back 3⁄4 walks toward **upper-right**
 * - `-se` front 3⁄4 walks toward **lower-right** (primary gameplay)
 * - `-n` / `-s` back / front
 * Runtime mirrors: NW←NE, W←E, SW←SE via FacingPick.mirror (scale.x).
 *
 * If new art is authored facing the opposite lateral side, either flip the
 * PNG to match this convention or register the slug+DirKey in
 * ART_LATERAL_INVERT below (XOR'd into mirror at draw time).
 */

export type DirKey = "n" | "ne" | "e" | "se" | "s";
export type Gender = "male" | "female" | "pepeka";

export type FacingPick = {
  /** Base art key (W/SW/NW are mirrors of E/SE/NE). */
  key: DirKey;
  /** Horizontal flip for west-side facings. */
  mirror: boolean;
};

/**
 * Job sprite slugs whose authored art for a DirKey faces the opposite lateral
 * side of the TIM convention. Empty after baking flips into PNGs; keep as the
 * systemic escape hatch for future kits.
 */
export const ART_LATERAL_INVERT: Readonly<
  Partial<Record<string, ReadonlySet<DirKey>>>
> = {
  // e.g. "some-job": new Set(["e", "ne"]),
};

/** Apply ART_LATERAL_INVERT: XOR mirror so wrong-facing art still tracks movement. */
export function applyArtFacing(jobSlug: string, pick: FacingPick): FacingPick {
  const dirs = ART_LATERAL_INVERT[jobSlug];
  if (!dirs || !dirs.has(pick.key)) return pick;
  return { key: pick.key, mirror: !pick.mirror };
}

const OCT_PICKS: FacingPick[] = [
  { key: "s", mirror: false },
  { key: "se", mirror: false },
  { key: "e", mirror: false },
  { key: "ne", mirror: false },
  { key: "n", mirror: false },
  { key: "ne", mirror: true }, // nw
  { key: "e", mirror: true }, // w
  { key: "se", mirror: true }, // sw
];

function pickEquals(a: FacingPick, b: FacingPick): boolean {
  return a.key === b.key && a.mirror === b.mirror;
}

function octFromPick(p: FacingPick): number {
  for (let i = 0; i < OCT_PICKS.length; i++) {
    if (pickEquals(OCT_PICKS[i]!, p)) return i;
  }
  return 1;
}

/**
 * Map movement facing into sprite buckets, corrected for the isometric camera.
 *
 * Art labels are world-style (S = front of character, N = back). The camera sits
 * on the +X/+Z diagonal, so we subtract the unit→camera yaw before bucketing:
 * relative 0 = facing the camera → S sprite.
 * Mirrors: NW←NE, W←E, SW←SE.
 *
 * Pass `prev` to apply hysteresis so micro angle noise doesn't flicker buckets.
 */
export function facingPick(
  worldFacing: number,
  toCameraYaw: number,
  prev?: FacingPick | null,
): FacingPick {
  const twoPi = Math.PI * 2;
  const step = Math.PI / 4;
  let a = worldFacing - toCameraYaw;
  a = ((a % twoPi) + twoPi) % twoPi;

  // Sticky: stay on previous octant until past the boundary by ~⅓ of a sector
  if (prev) {
    const cur = octFromPick(prev);
    const center = cur * step;
    let delta = a - center;
    delta = ((delta % twoPi) + twoPi) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (Math.abs(delta) < step * 0.65) return prev;
  }

  const oct = Math.round(a / step) % 8;
  return OCT_PICKS[oct] ?? OCT_PICKS[1]!;
}

export type AnimKey = "idle" | "walk" | "melee" | "cast" | "rest" | "dead";

/** Walk cycle frame: 0 = primary stride, 1 = opposite-foot stride. */
export type WalkFrame = 0 | 1;

/** Male / pepeka use unisex male kit for now; female uses `*-f-…`. */
export function spriteSlug(base: string, gender: Gender = "male"): string {
  return gender === "female" ? `${base}-f` : base;
}

/** Authored melee PNG version numbers per job slug (male / female). */
const MELEE_VERSIONS: Record<string, readonly number[]> = {
  /** v1–v3 were byte-identical; authored distinct attack poses are v4–v6. */
  tim: [4, 5, 6],
  /** v2 overhead, v3 mid, v4 thrust, v5 slash */
  "tim-f": [2, 3, 4, 5],
  knight: [1, 2, 3, 4],
  "knight-f": [1, 2, 3, 4],
  rogue: [1, 2, 3, 4],
  "rogue-f": [1, 2, 3, 4],
  cleric: [1, 2, 3, 4],
  "cleric-f": [1, 2, 3, 4],
  sorc: [1, 2, 3, 4],
  "sorc-f": [1, 2, 3, 4],
  fighter: [1, 2, 3, 4],
  "fighter-f": [1, 2, 3, 4],
  battlemage: [1, 2, 3, 4],
  "battlemage-f": [1, 2, 3, 4],
};

export function meleeVersionsFor(jobSlug: string): readonly number[] {
  return MELEE_VERSIONS[jobSlug] ?? [1];
}

/** Pick a random authored melee variant for this job/gender (stable until next call). */
export function pickMeleeVariant(jobSlug: string): number {
  const vers = meleeVersionsFor(jobSlug);
  return vers[Math.floor(Math.random() * vers.length)] ?? 1;
}

export function meleeSpriteUrl(jobSlug: string, variant: number): string {
  return `/sprites/${jobSlug}-melee-v${variant}.png`;
}

function meleeExtras(jobSlug: string): string[] {
  return meleeVersionsFor(jobSlug).map((v) => `melee-v${v}.png`);
}

function walkUrl(jobSlug: string, key: DirKey, frame: WalkFrame = 0): string {
  /** Opposite-foot frames only for male TIM/Knight authored `*-walk-*-2.png`. */
  const base = jobSlug.replace(/-f$/, "");
  if (
    frame === 1 &&
    !jobSlug.endsWith("-f") &&
    (base === "tim" || base === "knight")
  ) {
    return `/sprites/${jobSlug}-walk-${key}-2.png`;
  }
  return `/sprites/${jobSlug}-walk-${key}.png`;
}

export function timSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("tim", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee") {
    const v = meleeVariant ?? meleeVersionsFor(s)[0] ?? 4;
    return meleeSpriteUrl(s, v);
  }
  if (anim === "cast") return `/sprites/${s}-cast-v2.png`;
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function knightSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("knight", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee") {
    const v = meleeVariant ?? meleeVersionsFor(s)[0] ?? 1;
    return meleeSpriteUrl(s, v);
  }
  if (anim === "cast") return `/sprites/${s}-cast-v1.png`;
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function fighterSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("fighter", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee" || anim === "cast") {
    const v =
      anim === "melee"
        ? (meleeVariant ?? meleeVersionsFor(s)[0] ?? 1)
        : (meleeVersionsFor(s)[0] ?? 1);
    return meleeSpriteUrl(s, v);
  }
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function rogueSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("rogue", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee" || anim === "cast") {
    const v =
      anim === "melee"
        ? (meleeVariant ?? meleeVersionsFor(s)[0] ?? 1)
        : (meleeVersionsFor(s)[0] ?? 1);
    return meleeSpriteUrl(s, v);
  }
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function clericSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("cleric", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee") {
    const v = meleeVariant ?? meleeVersionsFor(s)[0] ?? 1;
    return meleeSpriteUrl(s, v);
  }
  if (anim === "cast") return `/sprites/${s}-cast-v1.png`;
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function sorcererSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("sorc", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee") {
    const v = meleeVariant ?? meleeVersionsFor(s)[0] ?? 1;
    return meleeSpriteUrl(s, v);
  }
  if (anim === "cast") return `/sprites/${s}-cast-v1.png`;
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function battleMageSpriteUrl(
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  const s = spriteSlug("battlemage", gender);
  if (anim === "dead") return `/sprites/${s}-idle-${key}.png`;
  if (anim === "rest") return `/sprites/${s}-rest-v1.png`;
  if (anim === "melee") {
    const v = meleeVariant ?? meleeVersionsFor(s)[0] ?? 1;
    return meleeSpriteUrl(s, v);
  }
  if (anim === "cast") return `/sprites/${s}-cast-v1.png`;
  if (anim === "walk") return walkUrl(s, key, walkFrame);
  return `/sprites/${s}-idle-${key}.png`;
}

export function playerSpriteUrl(
  job: string | undefined,
  anim: AnimKey,
  key: DirKey,
  walkFrame: WalkFrame = 0,
  gender: Gender = "male",
  meleeVariant?: number,
): string {
  if (job === "knight") return knightSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  if (job === "rogue") return rogueSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  if (job === "fighter") return fighterSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  if (job === "sorcerer") return sorcererSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  if (job === "cleric") return clericSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  if (job === "battle_mage") return battleMageSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
  return timSpriteUrl(anim, key, walkFrame, gender, meleeVariant);
}

/** Sprite file base slug for a job id (`sorc`, `battlemage`, `tim`, …). */
export function jobSpriteBase(job: string | undefined): string {
  if (job === "knight") return "knight";
  if (job === "rogue") return "rogue";
  if (job === "fighter") return "fighter";
  if (job === "sorcerer") return "sorc";
  if (job === "cleric") return "cleric";
  if (job === "battle_mage") return "battlemage";
  return "tim";
}

/** ~4.5 fps two-frame walk cycle. */
export function walkFrameAt(nowMs: number): WalkFrame {
  return (Math.floor(nowMs / 220) % 2) as WalkFrame;
}

const WALK_DIRS = ["se", "s", "e", "n", "ne"] as const;

function walkPairUrls(jobSlug: string): string[] {
  const primary = WALK_DIRS.map((d) => `/sprites/${jobSlug}-walk-${d}.png`);
  const base = jobSlug.replace(/-f$/, "");
  if (jobSlug.endsWith("-f") || (base !== "tim" && base !== "knight")) return primary;
  return WALK_DIRS.flatMap((d) => [
    `/sprites/${jobSlug}-walk-${d}.png`,
    `/sprites/${jobSlug}-walk-${d}-2.png`,
  ]);
}

function jobUrlSet(base: string, extras: string[], gender: Gender = "male"): string[] {
  const s = spriteSlug(base, gender);
  return [
    `/sprites/${s}-idle-se.png`,
    `/sprites/${s}-idle-s.png`,
    `/sprites/${s}-idle-e.png`,
    `/sprites/${s}-idle-n.png`,
    `/sprites/${s}-idle-ne.png`,
    ...walkPairUrls(s),
    ...extras.map((e) => `/sprites/${spriteSlug(base, gender)}-${e}`),
  ];
}

export const FLUX_AURA_URL = "/sprites/fx-flux-aura-v1.png";

export function timSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("tim", gender);
  return [
    `/sprites/${s}-idle-se.png`,
    `/sprites/${s}-idle-s.png`,
    `/sprites/${s}-idle-e.png`,
    `/sprites/${s}-idle-n.png`,
    `/sprites/${s}-idle-ne.png`,
    ...walkPairUrls(s),
    `/sprites/${s}-cast-v2.png`,
    ...meleeExtras(s).map((e) => `/sprites/${s}-${e}`),
    `/sprites/${s}-rest-v1.png`,
    FLUX_AURA_URL,
  ];
}

export const TIM_SPRITE_URLS = timSpriteUrls("male");

export function knightSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("knight", gender);
  return jobUrlSet("knight", ["cast-v1.png", ...meleeExtras(s), "rest-v1.png"], gender);
}
export const KNIGHT_SPRITE_URLS = knightSpriteUrls("male");

export function sorcererSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("sorc", gender);
  return jobUrlSet("sorc", ["cast-v1.png", ...meleeExtras(s), "rest-v1.png"], gender);
}
export const SORCERER_SPRITE_URLS = sorcererSpriteUrls("male");

export function fighterSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("fighter", gender);
  return jobUrlSet("fighter", [...meleeExtras(s), "rest-v1.png"], gender);
}
export const FIGHTER_SPRITE_URLS = fighterSpriteUrls("male");

export function clericSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("cleric", gender);
  return jobUrlSet("cleric", ["cast-v1.png", ...meleeExtras(s), "rest-v1.png"], gender);
}
export const CLERIC_SPRITE_URLS = clericSpriteUrls("male");

export function rogueSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("rogue", gender);
  return jobUrlSet("rogue", [...meleeExtras(s), "rest-v1.png"], gender);
}
export const ROGUE_SPRITE_URLS = rogueSpriteUrls("male");

export function battleMageSpriteUrls(gender: Gender = "male"): string[] {
  const s = spriteSlug("battlemage", gender);
  return jobUrlSet("battlemage", ["cast-v1.png", ...meleeExtras(s), "rest-v1.png"], gender);
}
export const BATTLEMAGE_SPRITE_URLS = battleMageSpriteUrls("male");

export function playerSpriteUrls(job: string | undefined, gender: Gender = "male"): string[] {
  if (job === "knight") return knightSpriteUrls(gender);
  if (job === "rogue") return rogueSpriteUrls(gender);
  if (job === "fighter") return fighterSpriteUrls(gender);
  if (job === "sorcerer") return sorcererSpriteUrls(gender);
  if (job === "cleric") return clericSpriteUrls(gender);
  if (job === "battle_mage") return battleMageSpriteUrls(gender);
  return timSpriteUrls(gender);
}

export const GUARD_SPRITE_URLS = [
  "/sprites/guard-idle-v2.png",
  "/sprites/guard-melee-v2.png",
];

export function guardSpriteUrl(anim: AnimKey): string {
  if (anim === "melee") return "/sprites/guard-melee-v2.png";
  return "/sprites/guard-idle-v2.png";
}

/** Pale Hollow hub NPCs — SE idle only (static billboards). */
const HUB_NPC_SPRITES: Record<string, string> = {
  "npc-shard-elder": "/sprites/shardelder-idle-se.png",
  "npc-ph-herald": "/sprites/herald-idle-se.png",
  "npc-ph-job-master": "/sprites/jobmaster-idle-se.png",
  "npc-ph-crafter": "/sprites/craftmaster-idle-se.png",
  "npc-ph-vendor": "/sprites/provisioner-idle-se.png",
  "npc-ph-chronomancer": "/sprites/chronomancer-idle-se.png",
};

export const HUB_NPC_SPRITE_URLS = Object.values(HUB_NPC_SPRITES);

export function npcSpriteUrl(npcId: string): string | undefined {
  return HUB_NPC_SPRITES[npcId];
}

const MOB_SPRITES: Record<
  string,
  { idle: string; melee?: string; walk?: string; walk2?: string }
> = {
  dust_hare: {
    idle: "/sprites/dusthare-idle-se.png",
    melee: "/sprites/dusthare-melee-se.png",
    walk: "/sprites/dusthare-walk-se.png",
    walk2: "/sprites/dusthare-walk-se-2.png",
  },
  pale_slime: {
    idle: "/sprites/paleslime-idle-se.png",
    melee: "/sprites/paleslime-melee-se.png",
    walk: "/sprites/paleslime-walk-se.png",
    walk2: "/sprites/paleslime-walk-se-2.png",
  },
  hollow_scavenger: {
    idle: "/sprites/scavenger-idle-se.png",
    walk: "/sprites/scavenger-walk-se.png",
  },
  ashbeam_boar: {
    idle: "/sprites/ashboar-idle-se.png",
    walk: "/sprites/ashboar-walk-se.png",
  },
  ruin_dweller: {
    idle: "/sprites/ruindweller-idle-se.png",
    walk: "/sprites/ruindweller-walk-se.png",
  },
  cliff_adder: {
    idle: "/sprites/cliffadder-idle-se.png",
    walk: "/sprites/cliffadder-walk-se.png",
  },
  seam_golem: {
    idle: "/sprites/seamgolem-idle-se.png",
    walk: "/sprites/seamgolem-walk-se.png",
  },
  shard_wight: {
    idle: "/sprites/shardwight-idle-se.png",
    walk: "/sprites/shardwight-walk-se.png",
  },
};

export const FIELD_MOB_SPRITE_URLS = Object.values(MOB_SPRITES).flatMap((s) => {
  const urls = [s.idle];
  if (s.melee) urls.push(s.melee);
  if (s.walk) urls.push(s.walk);
  if (s.walk2) urls.push(s.walk2);
  return urls;
});

/** True when this archetype has an authored melee PNG (else client uses lunge/flash). */
export function mobHasMeleeSprite(archetype: string | undefined): boolean {
  if (!archetype) return false;
  return Boolean(MOB_SPRITES[archetype]?.melee);
}

export function mobSpriteUrl(
  archetype: string | undefined,
  anim: AnimKey,
  walkFrame: WalkFrame = 0,
): string {
  const set = archetype ? MOB_SPRITES[archetype] : undefined;
  if (!set) return guardSpriteUrl(anim);
  // Dedicated attack pose when authored; cast has no mob PNGs yet (VFX + tint carry the tell).
  if (anim === "melee" && set.melee) return set.melee;
  if (anim === "walk") {
    if (set.walk2) {
      return walkFrame === 1 ? set.walk2 : (set.walk ?? set.idle);
    }
    if (set.walk) {
      return walkFrame === 1 ? set.walk : set.idle;
    }
  }
  return set.idle;
}

export const FLOOR_TEX = "/sprites/hall-floor.png";

export type JobId =
  | "knight"
  | "rogue"
  | "cleric"
  | "sorcerer"
  | "fighter"
  | "battlemage"
  | "tim";

export const EQUIP_SLOTS = [
  "head",
  "body",
  "hands",
  "legs",
  "feet",
  "ring",
  "earring",
  "main",
  "sub",
  "grip",
  "ranged",
  "ammo",
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];
export type Equipment = Record<EquipSlot, number | null>;

export type CraftSkill =
  | "smithing"
  | "woodworking"
  | "leathercraft"
  | "clothcraft"
  | "bonecraft"
  | "goldsmithing"
  | "alchemy"
  | "cooking";

export type ItemKind =
  | "base"
  | "intermediate"
  | "equipment"
  | "consumable"
  | "filler"
  | "bait";

export type WeaponFamily =
  | "sword"
  | "greatsword"
  | "dagger"
  | "axe"
  | "staff"
  | "club"
  | "knuckles";

export type ItemStats = {
  str?: number;
  dex?: number;
  vit?: number;
  agi?: number;
  int?: number;
  mnd?: number;
  atk?: number;
  def?: number;
  acc?: number;
  eva?: number;
  mab?: number;
  mdb?: number;
  hp?: number;
  mp?: number;
};

export type ConsumeEffect = {
  hp?: number;
  mp?: number;
  statusClear?: string;
  foodDurationSec?: number;
  scrollSpellId?: string;
};

export type ItemDef = {
  id: number;
  name: string;
  description: string;
  icon: string;
  slug: string;
  kind: ItemKind;
  craftLevel?: number;
  craftSkill?: CraftSkill;
  slot?: EquipSlot;
  jobRestrict?: JobId[] | "all";
  twoHand?: boolean;
  delayMs?: number;
  stats?: ItemStats;
  consume?: ConsumeEffect;
  recipe?: {
    kek: number;
    materialsText: string;
    /** Structured materials when available (preferred over parsing materialsText). */
    materials?: { slug: string; qty: number }[];
  };
  /** Zone / method text for base mats (from manifest Obtained From). */
  obtainedFrom?: string;
  /** Main-hand family for weapon skills (TP). */
  weaponFamily?: WeaponFamily;
};

/** HQ = NQ × 1.25 (ceil) for numeric combat fields. */
export function hqStats(nq: ItemStats | undefined): ItemStats {
  if (!nq) return {};
  const out: ItemStats = {};
  for (const [k, v] of Object.entries(nq) as [keyof ItemStats, number | undefined][]) {
    if (typeof v === "number") out[k] = Math.ceil(v * 1.25);
  }
  return out;
}

export function budgetPoints(craftLevel: number): number {
  return Math.max(1, Math.floor(craftLevel / 5) + 1);
}

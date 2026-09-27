export type {
  JobId,
  EquipSlot,
  CraftSkill,
  ItemKind,
  WeaponFamily,
  ItemStats,
  ConsumeEffect,
  ItemDef,
} from "./types";
export { hqStats, budgetPoints } from "./types";
export { CATALOG, CATALOG_BY_ID, CATALOG_BY_SLUG } from "./catalog.generated";
export {
  CRAFT_SKILLS,
  CRAFT_SKILL_LABEL,
  closeCraftRecipes,
  craftXpToNext,
  emptyCraftSkills,
  getCraftableItem,
  ownedMatQty,
  parseMaterialsText,
  recipeMaterials,
  type CloseCraftCandidate,
  type CraftSkillState,
  type RecipeMat,
} from "./craft";

import { CATALOG_BY_ID } from "./catalog.generated";
import type { ItemDef } from "./types";

/** MVP legacy IDs — stable across catalog regen. */
export const ITEM = {
  STAFF_ASHBEAM: 1,
  ROBE_LINEN: 2,
  POTION: 3,
  SWORD_IRON: 4,
  MAIL_IRON: 5,
  DAGGER_IRON: 6,
  LEATHER_VEST: 7,
  GREATSWORD_IRON: 8,
  SCALE_HARNESS: 9,
} as const;

export function getItem(id: number): ItemDef | undefined {
  return CATALOG_BY_ID[id];
}

export function itemName(id: number): string {
  return CATALOG_BY_ID[id]?.name ?? `#${id}`;
}

export function itemIcon(id: number): string {
  return CATALOG_BY_ID[id]?.icon ?? "/icons/items/unknown.png";
}

export function itemDescription(id: number): string {
  return CATALOG_BY_ID[id]?.description ?? "";
}

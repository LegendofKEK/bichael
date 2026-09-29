export type {
  JobId,
  EquipSlot,
  Equipment,
  CraftSkill,
  ItemKind,
  WeaponFamily,
  ItemStats,
  ConsumeEffect,
  ItemDef,
} from "./types";
export { EQUIP_SLOTS, hqStats, budgetPoints } from "./types";
export { CATALOG, CATALOG_BY_ID, CATALOG_BY_SLUG } from "./catalog.generated";
export {
  CRAFT_SKILLS,
  CRAFT_SKILL_LABEL,
  closeCraftRecipes,
  cloneCraftSkills,
  craftXpForRecipe,
  craftXpToNext,
  displayMatsForRecipe,
  emptyCraftSkills,
  getCraftableItem,
  ownedMatQty,
  parseMaterialGroups,
  parseMaterialGroupsDetailed,
  parseMaterialsText,
  pickAffordableMaterials,
  recipeMaterialGroups,
  recipeMaterials,
  recipeMaterialsComplete,
  type CloseCraftCandidate,
  type CraftSkillState,
  type RecipeMat,
  type RecipeMatGroup,
} from "./craft";

import { CATALOG_BY_ID } from "./catalog.generated";
import { EQUIP_SLOTS, type Equipment, type EquipSlot, type ItemDef, type ItemStats } from "./types";

/** MVP legacy IDs â€” stable across catalog regen. */
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

/** Empty canonical equipment state for new players and save migration. */
export function emptyEquipment(): Equipment {
  return Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot, null])) as Equipment;
}

/** Sum catalog stats for items equipped in their authored slots. */
export function aggregateEquipmentStats(
  equipment: Partial<Record<EquipSlot, number | null | undefined>>,
): ItemStats {
  const total: ItemStats = {};
  for (const slot of EQUIP_SLOTS) {
    const tokenId = equipment[slot];
    if (tokenId == null) continue;
    const def = getItem(tokenId);
    if (!def || def.slot !== slot) continue;
    for (const [key, value] of Object.entries(def.stats ?? {}) as [keyof ItemStats, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}


/**

 * Cross-job ability helpers — AbilityId is the union of all job kits.

 */



import {

  KNIGHT_ABILITIES,

  KNIGHT_ABILITY_IDS,

  KNIGHT_CATEGORY_TABS,

  isKnightAbilityId,

  knightAbilitiesUnlocked,

  knightAbilityIconUrl,

  knightAbilityTooltip,

  knightHotbarOrder,

  type KnightAbilityId,

} from "./knight-kit";



import {

  CLERIC_ABILITIES,

  CLERIC_ABILITY_IDS,

  CLERIC_CATEGORY_TABS,

  isClericAbilityId,

  clericAbilitiesUnlocked,

  clericAbilityIconUrl,

  clericAbilityTooltip,

  clericHotbarOrder,

  type ClericAbilityId,

} from "./cleric-kit";



import {

  ROGUE_ABILITIES,

  ROGUE_ABILITY_IDS,

  ROGUE_CATEGORY_TABS,

  isRogueAbilityId,

  rogueAbilitiesUnlocked,

  rogueAbilityIconUrl,

  rogueAbilityTooltip,

  rogueHotbarOrder,

  type RogueAbilityId,

} from "./rogue-kit";



import {

  SORCERER_ABILITIES,

  SORCERER_ABILITY_IDS,

  SORCERER_CATEGORY_TABS,

  isSorcererAbilityId,

  sorcererAbilitiesUnlocked,

  sorcererAbilityIconUrl,

  sorcererAbilityTooltip,

  sorcererHotbarOrder,

  type SorcererAbilityId,

} from "./sorcerer-kit";



import {

  FIGHTER_ABILITIES,

  FIGHTER_ABILITY_IDS,

  FIGHTER_CATEGORY_TABS,

  isFighterAbilityId,

  fighterAbilitiesUnlocked,

  fighterAbilityIconUrl,

  fighterAbilityTooltip,

  fighterHotbarOrder,

  type FighterAbilityId,

} from "./fighter-kit";



import {

  BATTLEMAGE_ABILITIES,

  BATTLEMAGE_ABILITY_IDS,

  BATTLEMAGE_CATEGORY_TABS,

  isBattleMageAbilityId,

  battleMageAbilitiesUnlocked,

  battleMageAbilityIconUrl,

  battleMageAbilityTooltip,

  battleMageHotbarOrder,

  type BattleMageAbilityId,

} from "./battlemage-kit";



import {

  ABILITY_CATEGORY_TABS,

  TIM_ABILITIES,

  TIM_ABILITY_IDS,

  isTimAbilityId,

  timAbilitiesUnlocked,

  timAbilityIconUrl,

  timAbilityTooltip,

  timHotbarOrder,

  type AbilityTooltip,

  type TimAbilityId,

} from "./tim-kit";

import {
  WEAPON_TP_ABILITIES,
  WEAPON_TP_ABILITY_IDS,
  WEAPON_TP_CATEGORY_TAB,
  isWeaponTpAbilityId,
  weaponTpAbilityIconUrl,
  weaponTpAbilityTooltip,
  type WeaponTpAbilityId,
} from "./weapon-tp";



import type { JobId } from "./jobs";
import {
  isTrainerFreeAbility,
  trainerAbilityDustCost,
} from "./trainer";
export {
  TRAINER_COST_MAX,
  TRAINER_COST_MAX_LEVEL,
  TRAINER_COST_MIN,
  TRAINER_FREE_ABILITY_IDS,
  isTrainerFreeAbility,
  requiresTrainerPurchase,
  trainerAbilityDustCost,
} from "./trainer";

import { SHARED_ABILITY_ICON } from "./shared-icons";



/** Unique ability id list (rest appears in multiple kits once). */

export const ALL_ABILITY_IDS = Array.from(

  new Set<string>([

    ...TIM_ABILITY_IDS,

    ...KNIGHT_ABILITY_IDS,

    ...ROGUE_ABILITY_IDS,

    ...SORCERER_ABILITY_IDS,

    ...FIGHTER_ABILITY_IDS,

    ...BATTLEMAGE_ABILITY_IDS,

    ...CLERIC_ABILITY_IDS,

    ...WEAPON_TP_ABILITY_IDS,

  ]),

) as [string, ...string[]];



export type AbilityId =

  | TimAbilityId

  | KnightAbilityId

  | RogueAbilityId

  | SorcererAbilityId

  | FighterAbilityId

  | ClericAbilityId
  | BattleMageAbilityId

  | WeaponTpAbilityId;



export function isAbilityId(id: string): id is AbilityId {

  return (

    isTimAbilityId(id) ||

    isKnightAbilityId(id) ||

    isRogueAbilityId(id) ||

    isSorcererAbilityId(id) ||

    isFighterAbilityId(id) ||

    isClericAbilityId(id) ||
    isBattleMageAbilityId(id) ||

    isWeaponTpAbilityId(id)
  );
}



export {

  isWeaponTpAbilityId,

  isRogueAbilityId,

  isClericAbilityId,

  isSorcererAbilityId,

  isFighterAbilityId,
  isBattleMageAbilityId,
};

export { SHARED_ABILITY_ICON, SHARED_SPELL_ICON_CONCEPTS } from "./shared-icons";



export function abilityIconUrl(id: AbilityId | string): string {
  if (isWeaponTpAbilityId(id)) return weaponTpAbilityIconUrl(id);
  const shared = SHARED_ABILITY_ICON[id];

  if (shared) return shared;



  if (isBattleMageAbilityId(id)) return battleMageAbilityIconUrl(id);
  if (isClericAbilityId(id)) return clericAbilityIconUrl(id);

  if (isSorcererAbilityId(id)) return sorcererAbilityIconUrl(id);

  if (isFighterAbilityId(id)) return fighterAbilityIconUrl(id);

  if (isRogueAbilityId(id) && !isTimAbilityId(id) && !isKnightAbilityId(id)) {

    return rogueAbilityIconUrl(id);

  }

  if (isKnightAbilityId(id) && !isTimAbilityId(id)) return knightAbilityIconUrl(id);

  if (isTimAbilityId(id)) return timAbilityIconUrl(id);

  if (isKnightAbilityId(id)) return knightAbilityIconUrl(id);

  if (isRogueAbilityId(id)) return rogueAbilityIconUrl(id);

  return `/icons/abilities/${id}.png`;

}



export function abilityLabel(id: AbilityId): string {
  if (isWeaponTpAbilityId(id)) return WEAPON_TP_ABILITIES[id].label;

  if (isTimAbilityId(id)) return TIM_ABILITIES[id].label;

  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].label;

  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].label;

  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].label;

  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].label;

  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].label;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].label;
  return id;

}



export function abilityGlyph(id: AbilityId): string {
  if (isWeaponTpAbilityId(id)) return WEAPON_TP_ABILITIES[id].glyph;

  if (isTimAbilityId(id)) return TIM_ABILITIES[id].glyph;

  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].glyph;

  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].glyph;

  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].glyph;

  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].glyph;

  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].glyph;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].glyph;
  return "?";

}



export function abilityTooltip(id: AbilityId): AbilityTooltip | string {
  if (isWeaponTpAbilityId(id)) return weaponTpAbilityTooltip(id);

  if (isTimAbilityId(id)) return timAbilityTooltip(id);

  if (isKnightAbilityId(id)) return knightAbilityTooltip(id);

  if (isRogueAbilityId(id)) return rogueAbilityTooltip(id);

  if (isSorcererAbilityId(id)) return sorcererAbilityTooltip(id);

  if (isFighterAbilityId(id)) return fighterAbilityTooltip(id);

  if (isClericAbilityId(id)) return clericAbilityTooltip(id);
  if (isBattleMageAbilityId(id)) return battleMageAbilityTooltip(id);
  return id;

}



export function hotbarOrderForJob(job: JobId, unlocked: readonly AbilityId[]): AbilityId[] {

  if (job === "time_mage") return timHotbarOrder(unlocked as TimAbilityId[]);

  if (job === "knight") return knightHotbarOrder(unlocked as KnightAbilityId[]);

  if (job === "rogue") return rogueHotbarOrder(unlocked as RogueAbilityId[]);

  if (job === "sorcerer") return sorcererHotbarOrder(unlocked as SorcererAbilityId[]);

  if (job === "fighter") return fighterHotbarOrder(unlocked as FighterAbilityId[]);

  if (job === "cleric") return clericHotbarOrder(unlocked as ClericAbilityId[]);
  if (job === "battle_mage") return battleMageHotbarOrder(unlocked as BattleMageAbilityId[]);
  return [];

}

/** Main hotbar order, then support abilities not already listed, then weapon skills. */
export function hotbarOrderDual(
  main: JobId,
  sub: JobId | null | undefined,
  unlocked: readonly AbilityId[],
): AbilityId[] {
  const primary = hotbarOrderForJob(main, unlocked);
  const seen = new Set(primary);
  const out: AbilityId[] = [...primary];
  if (sub && sub !== main) {
    for (const id of hotbarOrderForJob(sub, unlocked)) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of unlocked) {
    if (!isWeaponTpAbilityId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}



export function abilitiesUnlockedForJob(
  job: JobId,
  level: number,
  learned: readonly string[] = [],
): AbilityId[] {
  if (job === "time_mage") return timAbilitiesUnlocked(level, learned);
  if (job === "knight") return knightAbilitiesUnlocked(level, learned);
  if (job === "rogue") return rogueAbilitiesUnlocked(level, learned);
  if (job === "sorcerer") return sorcererAbilitiesUnlocked(level, learned);
  if (job === "fighter") return fighterAbilitiesUnlocked(level, learned);
  if (job === "cleric") return clericAbilitiesUnlocked(level, learned);
  if (job === "battle_mage") return battleMageAbilitiesUnlocked(level, learned);
  return [];
}



export function abilityNeedsTarget(id: AbilityId): boolean {
  if (isWeaponTpAbilityId(id)) return true;

  if (isTimAbilityId(id)) {

    const def = TIM_ABILITIES[id];

    return !!(

      def.needsTarget ||

      def.category === "enfeeble" ||

      id === "temporal_distortion" ||

      id === "split_second"

    );

  }

  if (isKnightAbilityId(id)) {

    return !!KNIGHT_ABILITIES[id].needsTarget;

  }

  if (isRogueAbilityId(id)) {

    return !!ROGUE_ABILITIES[id].needsTarget;

  }

  if (isSorcererAbilityId(id)) {

    return !!SORCERER_ABILITIES[id].needsTarget;

  }

  if (isFighterAbilityId(id)) {

    return !!FIGHTER_ABILITIES[id].needsTarget;

  }

  if (isClericAbilityId(id)) {
    const def = CLERIC_ABILITIES[id];
    return !!(def.needsTarget || def.allyTarget);
  }
  if (isBattleMageAbilityId(id)) {
    const def = BATTLEMAGE_ABILITIES[id];
    return !!(
      def.needsTarget ||
      def.category === "enfeeble" ||
      def.category === "nuke" ||
      id === "full_circle"
    );
  }
  return false;

}



export function abilityMp(id: AbilityId): number {
  if (isWeaponTpAbilityId(id)) return 0;

  if (isTimAbilityId(id)) return TIM_ABILITIES[id].mp;

  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].mp;

  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].mp;

  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].mp;

  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].mp;

  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].mp;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].mp;
  return 0;

}



export function abilityRecastMs(id: AbilityId): number {
  if (isWeaponTpAbilityId(id)) return WEAPON_TP_ABILITIES[id].recastMs;

  if (isTimAbilityId(id)) return TIM_ABILITIES[id].recastMs;

  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].recastMs;

  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].recastMs;

  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].recastMs;

  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].recastMs;

  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].recastMs;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].recastMs;
  return 0;

}



export type AbilityUiCategory = string;



export function abilityCategory(id: AbilityId): AbilityUiCategory {
  if (isWeaponTpAbilityId(id)) return "weapon";

  if (isTimAbilityId(id)) return TIM_ABILITIES[id].category;

  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].category;

  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].category;

  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].category;

  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].category;

  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].category;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].category;
  return "utility";

}



export function categoryTabsForJob(job: JobId): { id: string; label: string }[] {

  if (job === "time_mage") {

    return ABILITY_CATEGORY_TABS.map((t) => ({ id: t.id, label: t.label }));

  }

  if (job === "knight") {

    return KNIGHT_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({

      id: t.id,

      label: t.label,

    }));

  }

  if (job === "rogue") {

    return ROGUE_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({

      id: t.id,

      label: t.label,

    }));

  }

  if (job === "sorcerer") {

    return SORCERER_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({

      id: t.id,

      label: t.label,

    }));

  }

  if (job === "fighter") {

    return FIGHTER_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({

      id: t.id,

      label: t.label,

    }));

  }

  if (job === "cleric") {
    return CLERIC_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({
      id: t.id,
      label: t.label,
    }));
  }
  if (job === "battle_mage") {
    return BATTLEMAGE_CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => ({
      id: t.id,
      label: t.label,
    }));
  }
  return [];
}

/** Merge main + support category tabs (first job wins on duplicate ids). */
export function categoryTabsDual(
  main: JobId,
  sub: JobId | null | undefined,
): { id: string; label: string }[] {
  const tabs = [...categoryTabsForJob(main)];
  if (!sub || sub === main) return tabs;
  const seen = new Set(tabs.map((t) => t.id));
  for (const t of categoryTabsForJob(sub)) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    tabs.push(t);
  }
  if (!tabs.some((t) => t.id === WEAPON_TP_CATEGORY_TAB.id)) {
    tabs.push({ id: WEAPON_TP_CATEGORY_TAB.id, label: WEAPON_TP_CATEGORY_TAB.label });
  }
  return tabs;
}




export function abilityUnlockLevel(id: AbilityId): number {
  if (isWeaponTpAbilityId(id)) return WEAPON_TP_ABILITIES[id].unlockLevel ?? 1;
  if (isTimAbilityId(id)) return TIM_ABILITIES[id].unlockLevel;
  if (isKnightAbilityId(id)) return KNIGHT_ABILITIES[id].unlockLevel;
  if (isRogueAbilityId(id)) return ROGUE_ABILITIES[id].unlockLevel;
  if (isSorcererAbilityId(id)) return SORCERER_ABILITIES[id].unlockLevel;
  if (isFighterAbilityId(id)) return FIGHTER_ABILITIES[id].unlockLevel;
  if (isClericAbilityId(id)) return CLERIC_ABILITIES[id].unlockLevel;
  if (isBattleMageAbilityId(id)) return BATTLEMAGE_ABILITIES[id].unlockLevel;
  return 1;
}

/** All ability ids belonging to a job kit (excludes weapon skills). */
export function abilityIdsForJob(job: JobId): AbilityId[] {
  if (job === "time_mage") return [...TIM_ABILITY_IDS];
  if (job === "knight") return [...KNIGHT_ABILITY_IDS];
  if (job === "rogue") return [...ROGUE_ABILITY_IDS];
  if (job === "sorcerer") return [...SORCERER_ABILITY_IDS];
  if (job === "fighter") return [...FIGHTER_ABILITY_IDS];
  if (job === "cleric") return [...CLERIC_ABILITY_IDS];
  if (job === "battle_mage") return [...BATTLEMAGE_ABILITY_IDS];
  return [];
}

/** Highest level cap that may buy this ability for current main/support. */
export function maxTrainLevelForAbility(
  main: JobId,
  mainLevel: number,
  sub: JobId | null | undefined,
  subLevel: number,
  id: AbilityId,
): number | null {
  const onMain = abilityIdsForJob(main).includes(id);
  const onSub = !!(sub && sub !== main && subLevel > 0 && abilityIdsForJob(sub).includes(id));
  if (!onMain && !onSub) return null;
  let cap = 0;
  // Main job: full player level. Support: floor(level/2). Prefer the higher applicable cap.
  if (onMain) cap = Math.max(cap, Math.max(1, mainLevel));
  if (onSub) cap = Math.max(cap, Math.max(1, subLevel));
  return cap;
}

/** True when Trainer may sell this ability under main/full + support half-level caps. */
export function canTrainAbility(
  main: JobId,
  mainLevel: number,
  sub: JobId | null | undefined,
  subLevel: number,
  id: AbilityId,
): boolean {
  if (isTrainerFreeAbility(id)) return false;
  const cap = maxTrainLevelForAbility(main, mainLevel, sub, subLevel, id);
  if (cap == null) return false;
  return abilityUnlockLevel(id) <= cap;
}

/** Trainer stock for a job at effective level (not free starter, not yet learned). */
export function jobAbilitiesForSale(
  job: JobId,
  level: number,
  learned: readonly string[],
): AbilityId[] {
  const learnedSet = new Set(learned);
  return abilityIdsForJob(job).filter((id) => {
    if (isTrainerFreeAbility(id)) return false;
    if (learnedSet.has(id)) return false;
    return abilityUnlockLevel(id) <= level;
  });
}

export type TrainerOffer = {
  id: AbilityId;
  label: string;
  cost: number;
  unlockLevel: number;
  /** Which job track this offer is sold under. */
  track: "main" | "support";
};

/**
 * Trainer offers for main + support at effective levels.
 * Main: up to current player level. Support: up to floor(level/2).
 * With no support: all main abilities up to current level. Never above those caps.
 */
export function trainerOffersForJobs(
  main: JobId,
  mainLevel: number,
  sub: JobId | null | undefined,
  subLevel: number,
  learned: readonly string[],
): TrainerOffer[] {
  const seen = new Set<string>();
  const out: TrainerOffer[] = [];
  const add = (job: JobId, level: number, track: "main" | "support") => {
    for (const id of jobAbilitiesForSale(job, level, learned)) {
      if (seen.has(id)) continue;
      // Defense in depth: never list an offer above the dual-job train cap.
      if (!canTrainAbility(main, mainLevel, sub, subLevel, id)) continue;
      seen.add(id);
      const unlockLevel = abilityUnlockLevel(id);
      out.push({
        id,
        label: abilityLabel(id),
        cost: trainerAbilityDustCost(unlockLevel),
        unlockLevel,
        track,
      });
    }
  };
  add(main, mainLevel, "main");
  if (sub && sub !== main && subLevel > 0) add(sub, subLevel, "support");
  out.sort((a, b) => a.unlockLevel - b.unlockLevel || a.label.localeCompare(b.label));
  return out;
}

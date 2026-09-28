/**
 * Shiny HQ runtime helpers — used by the Pale Hollow sim tick.
 * Aggro rule: HQ + clones stay `safe` (no auto-pull). They only fight after
 * the player engages / damages them (targetId set). Clones join via link/summon.
 */
import {
  PH_ALL_MOBS,
  SHINY_CLONE_COUNT,
  SHINY_FLEE_RELOCATE_MS,
  SHINY_LEVEL_BONUS,
  SHINY_MAT_DROP_CHANCE,
  shinyDisplayName,
  shinyHqChance,
  shinyLootTable,
  shinyScaledHp,
  type PaleHollowMobDef,
} from "@bellgrave/config";

export {
  SHINY_CLONE_COUNT,
  SHINY_FLEE_RELOCATE_MS,
  SHINY_LEVEL_BONUS,
  SHINY_MAT_DROP_CHANCE,
  shinyDisplayName,
  shinyHqChance,
  shinyLootTable,
  shinyScaledHp,
};

export type ShinyMobFields = {
  shiny: boolean;
  shinyClone: boolean;
  hqId: string | null;
  cloneIds: string[];
  /** True once HQ has fired its summon (no re-summon / no chain). */
  shinySummoned: boolean;
};

export function emptyShinyFields(): ShinyMobFields {
  return {
    shiny: false,
    shinyClone: false,
    hqId: null,
    cloneIds: [],
    shinySummoned: false,
  };
}

export function lookupMobDef(id: string): PaleHollowMobDef | undefined {
  const baseId = id.includes("-clone-") ? id.replace(/-clone-\d+$/, "") : id;
  return PH_ALL_MOBS.find((d) => d.id === baseId);
}

export function rollShinyPromotion(): boolean {
  const env = process.env.SHINY_HQ_CHANCE;
  const override = env != null && env !== "" ? Number(env) : undefined;
  return Math.random() < shinyHqChance(override);
}

export function applyShinyPromotion<
  T extends {
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    aggro: string;
    shiny: boolean;
    shinyClone: boolean;
    shinySummoned: boolean;
    cloneIds: string[];
    hqId: string | null;
  },
>(mob: T, def: PaleHollowMobDef): T {
  const level = def.level + SHINY_LEVEL_BONUS;
  const maxHp = shinyScaledHp(def.hp, def.level, level);
  mob.name = shinyDisplayName(def.name);
  mob.level = level;
  mob.maxHp = maxHp;
  mob.hp = maxHp;
  // Non-aggro until the player pulls — never auto-sight/sound/proximity.
  mob.aggro = "safe" as T["aggro"];
  mob.shiny = true;
  mob.shinyClone = false;
  mob.shinySummoned = false;
  mob.cloneIds = [];
  mob.hqId = null;
  return mob;
}

export function formationOffset(
  hqFacing: number,
  slot: number,
  spacing = 1.35,
): { dx: number; dz: number } {
  const back = -(1.1 + Math.floor(slot / 2) * spacing);
  const side = (slot % 2 === 0 ? -1 : 1) * (0.85 + (slot < 2 ? 0 : 0.35));
  const sin = Math.sin(hqFacing);
  const cos = Math.cos(hqFacing);
  return {
    dx: sin * back + cos * side,
    dz: cos * back - sin * side,
  };
}

export function rollShinyMat(archetype: string): string | null {
  if (Math.random() >= SHINY_MAT_DROP_CHANCE) return null;
  const table = shinyLootTable(archetype);
  if (!table.length) return null;
  return table[Math.floor(Math.random() * table.length)] ?? null;
}

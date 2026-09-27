import { CATALOG, CATALOG_BY_ID, CATALOG_BY_SLUG } from "./catalog.generated";
import type { CraftSkill, ItemDef } from "./types";

export const CRAFT_SKILLS: CraftSkill[] = [
  "smithing",
  "woodworking",
  "leathercraft",
  "clothcraft",
  "bonecraft",
  "goldsmithing",
  "alchemy",
  "cooking",
];

export const CRAFT_SKILL_LABEL: Record<CraftSkill, string> = {
  smithing: "Smithing",
  woodworking: "Woodworking",
  leathercraft: "Leathercraft",
  clothcraft: "Clothcraft",
  bonecraft: "Bonecraft",
  goldsmithing: "Goldsmithing",
  alchemy: "Alchemy",
  cooking: "Cooking",
};

export type RecipeMat = { slug: string; qty: number; name: string };

/** Display name (lowercase, stripped pack counts) → slug. */
const NAME_TO_SLUG: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const it of CATALOG) {
    const key = normalizeMatName(it.name);
    if (!m.has(key)) m.set(key, it.slug);
    // Also index without trailing ×N pack suffixes in the catalog name itself.
    const bare = key.replace(/×\d+$/u, "").trim();
    if (bare && !m.has(bare)) m.set(bare, it.slug);
  }
  return m;
})();

function normalizeMatName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/×/g, "×");
}

/** Parse catalog `materialsText` like `Copper Ore×2, Tin Ore×1, Pale Dust×1`. */
export function parseMaterialsText(text: string): RecipeMat[] {
  if (!text?.trim()) return [];
  const out: RecipeMat[] = [];
  for (const part of text.split(/,/)) {
    const raw = part.trim();
    if (!raw) continue;
    const m = /^(.+?)\s*[×x]\s*(\d+)\s*$/iu.exec(raw);
    const name = (m ? m[1]! : raw).trim();
    const qty = m ? Math.max(1, Number(m[2])) : 1;
    const slug = NAME_TO_SLUG.get(normalizeMatName(name));
    if (!slug) continue;
    const def = CATALOG_BY_SLUG[slug];
    out.push({ slug, qty, name: def?.name ?? name });
  }
  return out;
}

export function recipeMaterials(def: ItemDef): RecipeMat[] {
  const structured = def.recipe?.materials;
  if (structured?.length) {
    return structured.map((m) => ({
      slug: m.slug,
      qty: m.qty,
      name: CATALOG_BY_SLUG[m.slug]?.name ?? m.slug,
    }));
  }
  if (def.recipe?.materialsText) return parseMaterialsText(def.recipe.materialsText);
  return [];
}

export type CraftSkillState = { level: number; xp: number };

export function emptyCraftSkills(): Record<CraftSkill, CraftSkillState> {
  const out = {} as Record<CraftSkill, CraftSkillState>;
  for (const s of CRAFT_SKILLS) out[s] = { level: 1, xp: 0 };
  return out;
}

/** XP to advance from `level` → level+1. */
export function craftXpToNext(level: number): number {
  return 40 + level * 20;
}

export function ownedMatQty(
  slug: string,
  inventory: { tokenId: number; amount: number }[],
  baseMats: Record<string, number>,
): number {
  const def = CATALOG_BY_SLUG[slug];
  const fromInv = def ? inventory.find((i) => i.tokenId === def.id)?.amount ?? 0 : 0;
  const fromBase = baseMats[slug] ?? 0;
  return Math.max(fromInv, fromBase);
}

export type CloseCraftCandidate = {
  def: ItemDef;
  materials: RecipeMat[];
  /** 0–1 fraction of materials satisfied. */
  matFrac: number;
  skillLevel: number;
  needLevel: number;
  canCraft: boolean;
  score: number;
};

/**
 * Rank recipes the player is close to crafting.
 * Prefers high material readiness within a craft-level band.
 */
export function closeCraftRecipes(
  inventory: { tokenId: number; amount: number }[],
  baseMats: Record<string, number>,
  craftSkills: Partial<Record<CraftSkill, CraftSkillState>>,
  opts?: { skill?: CraftSkill | "all"; limit?: number },
): CloseCraftCandidate[] {
  const skillFilter = opts?.skill ?? "all";
  const limit = opts?.limit ?? 12;
  const scored: CloseCraftCandidate[] = [];

  for (const def of CATALOG) {
    if (!def.recipe || !def.craftSkill || def.craftLevel == null) continue;
    if (skillFilter !== "all" && def.craftSkill !== skillFilter) continue;
    const materials = recipeMaterials(def);
    if (materials.length === 0) continue;

    const skillLevel = craftSkills[def.craftSkill]?.level ?? 1;
    const needLevel = def.craftLevel;
    // Hide recipes far above current skill.
    if (needLevel > skillLevel + 8) continue;

    let haveParts = 0;
    for (const mat of materials) {
      const have = ownedMatQty(mat.slug, inventory, baseMats);
      haveParts += Math.min(1, have / mat.qty);
    }
    const matFrac = haveParts / materials.length;
    // Skip recipes with zero materials owned (unless skill-ready and level 1–3 starter).
    if (matFrac <= 0 && !(skillLevel >= needLevel && needLevel <= 3)) continue;

    const levelOk = skillLevel >= needLevel;
    const levelProx = levelOk ? 1 : Math.max(0, 1 - (needLevel - skillLevel) / 8);
    const canCraft = levelOk && matFrac >= 1;
    const score = matFrac * 100 + levelProx * 35 + (canCraft ? 40 : 0) - Math.max(0, needLevel - skillLevel) * 2;

    scored.push({ def, materials, matFrac, skillLevel, needLevel, canCraft, score });
  }

  scored.sort((a, b) => b.score - a.score || a.needLevel - b.needLevel);
  return scored.slice(0, limit);
}

export function getCraftableItem(id: number): ItemDef | undefined {
  const def = CATALOG_BY_ID[id];
  if (!def?.recipe || !def.craftSkill || def.craftLevel == null) return undefined;
  if (recipeMaterials(def).length === 0) return undefined;
  return def;
}

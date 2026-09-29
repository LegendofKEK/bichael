/**
 * Legend of Kek world bible — areas (field content) + cities (hubs).
 * Harvest / drop assignments mirror docs/legend-of-kek-item-manifest.xlsx Source Zones.
 *
 * Campaign order: Pale Hollow → Ashlands → Slagpits → Bellmarsh → Throne Approach.
 * After clearing the campaign, players may rerun with enemies scaled to character level.
 */

export const AREA_IDS = [
  "pale_hollow",
  "ashlands",
  "slagpits",
  "bellmarsh",
  "throne_approach",
] as const;
export type AreaId = (typeof AREA_IDS)[number];

export const CITY_IDS = [
  "shard_dwellings",
  "obsidia",
  "great_filter",
  "belltower_keep",
  "citadel_of_kek",
] as const;
export type CityId = (typeof CITY_IDS)[number];

export type GatherMethod = "mine" | "harvest" | "fish" | "drop";

export type HarvestNodeDef = {
  id: string;
  name: string;
  method: Exclude<GatherMethod, "drop">;
  /** Base-mat icon slugs from the item manifest. */
  yields: string[];
};

export type MobArchetypeDef = {
  id: string;
  name: string;
  /** Flavor tags for spawn tables / art. */
  tags: string[];
  /** Drop icon slugs (base mats) from the item manifest. */
  drops: string[];
};

export type NpcRole =
  | "quest_giver"
  | "job_master"
  | "spell_trainer"
  | "crafter"
  | "vendor"
  | "guide";

export type CityNpcDef = {
  id: string;
  name: string;
  role: NpcRole;
  /** Short hub purpose — quests / services unlocked here. */
  blurb: string;
};

export type AreaDef = {
  id: AreaId;
  name: string;
  levelBand: [number, number];
  /** Zone-wide catalyst dust slug. */
  catalyst: string;
  cityId: CityId;
  harvestNodes: HarvestNodeDef[];
  mobs: MobArchetypeDef[];
};

export type CityDef = {
  id: CityId;
  name: string;
  areaId: AreaId;
  /** Hub services present in every city unless noted. */
  npcs: CityNpcDef[];
};

/** Ordered campaign chapters (index 0 = start). */
export const CAMPAIGN_ORDER: AreaId[] = [
  "pale_hollow",
  "ashlands",
  "slagpits",
  "bellmarsh",
  "throne_approach",
];

export const CAMPAIGN = {
  /** Clear Throne Approach / Citadel to finish a run. */
  finaleAreaId: "throne_approach" as AreaId,
  finaleCityId: "citadel_of_kek" as CityId,
  /**
   * After campaign clear, field enemies scale to the player's level
   * (NG+ style infinite grind / craft loop).
   */
  replayScaling: {
    enabled: true,
    /** Multiplier applied per full campaign clear beyond the first. */
    clearBonusPerRun: 0.08,
    /** Soft cap on level-scaled HP/damage ratio vs character level. */
    maxLevelScale: 1.75,
  },
} as const;

export const AREAS: Record<AreaId, AreaDef> = {
  pale_hollow: {
    id: "pale_hollow",
    name: "Pale Hollow",
    levelBand: [1, 20],
    catalyst: "pale-dust",
    cityId: "shard_dwellings",
    harvestNodes: [
      {
        id: "ph-ore-vein",
        name: "Pale Hollow Ore Vein",
        method: "mine",
        yields: ["copper-ore", "tin-ore"],
      },
      {
        id: "ph-quarry",
        name: "Pale Hollow Quarry",
        method: "mine",
        yields: ["limestone", "cobble"],
      },
      {
        id: "ph-riverbank",
        name: "Pale Hollow Riverbank",
        method: "harvest",
        yields: ["potters-clay", "clay-crab", "river-sand"],
      },
      {
        id: "ph-forest",
        name: "Pale Hollow Forest",
        method: "harvest",
        yields: ["ashbeam-log", "bark-strip"],
      },
      {
        id: "ph-scrubland",
        name: "Pale Hollow Scrubland",
        method: "harvest",
        yields: ["dead-fiber", "pale-flax"],
      },
      {
        id: "ph-cliff-vines",
        name: "Pale Hollow Cliff Vines",
        method: "harvest",
        yields: ["climbing-cord"],
      },
      {
        id: "ph-herb-patch",
        name: "Pale Hollow Herb Patch",
        method: "harvest",
        yields: ["antidote-root"],
      },
      {
        id: "ph-farmland",
        name: "Pale Hollow Farmland",
        method: "harvest",
        yields: ["dustgrain", "pale-dust"],
      },
      {
        id: "ph-waters",
        name: "Pale Hollow Waters",
        method: "fish",
        yields: ["fossil-minnow"],
      },
    ],
    mobs: [
      {
        id: "ph-ruin-dweller",
        name: "Ruin Dweller",
        tags: ["construct", "ruin"],
        drops: ["cracked-brick", "metal-scrap", "pale-dust", "chainmail"],
      },
      {
        id: "ph-bandit",
        name: "Hollow Scavenger",
        tags: ["humanoid", "bandit"],
        drops: ["linen-scrap", "dried-ration-scrap", "pale-dust"],
      },
      {
        id: "ph-beast",
        name: "Hollow Beast",
        tags: ["beast"],
        drops: ["desiccated-hide", "soft-pelt", "horn", "pale-dust"],
      },
      {
        id: "ph-undead",
        name: "Shard Wight",
        tags: ["undead"],
        drops: ["bone-chip", "pale-dust"],
      },
      {
        id: "ph-slime",
        name: "Pale Slime",
        tags: ["slime"],
        drops: ["slime-oil", "pale-dust"],
      },
      {
        id: "ph-venom",
        name: "Cliff Adder",
        tags: ["beast", "venom"],
        drops: ["poison-sac", "pale-dust"],
      },
    ],
  },

  ashlands: {
    id: "ashlands",
    name: "Ashlands",
    levelBand: [21, 40],
    catalyst: "ash-dust",
    cityId: "obsidia",
    harvestNodes: [
      {
        id: "as-ore-vein",
        name: "Ashlands Ore Vein",
        method: "mine",
        yields: ["iron-ore"],
      },
      {
        id: "as-gem-vein",
        name: "Ashlands Gem Vein",
        method: "mine",
        yields: ["lapis"],
      },
      {
        id: "as-salt",
        name: "Ashlands Salt Flat",
        method: "mine",
        yields: ["rock-salt", "ink-salt"],
      },
      {
        id: "as-riverbed",
        name: "Ashlands Riverbed",
        method: "harvest",
        yields: ["iron-sand"],
      },
      {
        id: "as-deadwood",
        name: "Ashlands Deadwood Grove",
        method: "harvest",
        yields: ["petrified-lumber", "ancient-branch", "bark-strip"],
      },
      {
        id: "as-scrubland",
        name: "Ashlands Scrubland",
        method: "harvest",
        yields: ["shade-cotton", "ash-dust"],
      },
      {
        id: "as-waters",
        name: "Ashlands Waters",
        method: "fish",
        yields: ["stone-scale"],
      },
    ],
    mobs: [
      {
        id: "as-cultist",
        name: "Ash Scholar",
        tags: ["humanoid", "cultist"],
        drops: ["parchment", "ash-dust"],
      },
      {
        id: "as-beast",
        name: "Cinder Beast",
        tags: ["beast"],
        drops: ["soft-pelt", "horn", "ash-dust"],
      },
      {
        id: "as-large-undead",
        name: "Ash Colossus Remnant",
        tags: ["undead", "elite"],
        drops: ["giant-femur", "skull-plate", "ash-dust"],
      },
      {
        id: "as-golem",
        name: "Obsidian Construct",
        tags: ["construct", "golem"],
        drops: ["metal-scrap", "ash-dust"],
      },
      {
        id: "as-venom",
        name: "Salt Asp",
        tags: ["beast", "venom"],
        drops: ["poison-sac", "ash-dust"],
      },
    ],
  },

  slagpits: {
    id: "slagpits",
    name: "Slagpits",
    levelBand: [41, 60],
    catalyst: "slag-dust",
    cityId: "great_filter",
    harvestNodes: [
      {
        id: "sl-ore-vein",
        name: "Slagpits Ore Vein",
        method: "mine",
        yields: ["mythril-ore"],
      },
      {
        id: "sl-gem-vein",
        name: "Slagpits Gem Vein",
        method: "mine",
        yields: ["onyx"],
      },
      {
        id: "sl-sulfur",
        name: "Slagpits Sulfur Vent",
        method: "mine",
        yields: ["sulfur-bit"],
      },
      {
        id: "sl-forest",
        name: "Slagpits Forest",
        method: "harvest",
        yields: ["bloodbeam-log", "bark-strip"],
      },
      {
        id: "sl-scrubland",
        name: "Slagpits Scrubland",
        method: "harvest",
        yields: ["bitter-spice", "slag-dust"],
      },
    ],
    mobs: [
      {
        id: "sl-insect",
        name: "Slag Skitter",
        tags: ["insect"],
        drops: ["silk-thread", "insect-wing", "slag-dust"],
      },
      {
        id: "sl-undead-elite",
        name: "Filter Warden",
        tags: ["undead", "elite"],
        drops: ["skull-plate", "slag-dust"],
      },
      {
        id: "sl-slime",
        name: "Slag Slime",
        tags: ["slime"],
        drops: ["slime-oil", "slag-dust"],
      },
      {
        id: "sl-golem",
        name: "Furnace Golem",
        tags: ["construct", "golem"],
        drops: ["metal-scrap", "slag-dust"],
      },
      {
        id: "sl-venom",
        name: "Pit Stinger",
        tags: ["insect", "venom"],
        drops: ["poison-sac", "slag-dust"],
      },
    ],
  },

  bellmarsh: {
    id: "bellmarsh",
    name: "Bellmarsh",
    levelBand: [61, 80],
    catalyst: "bell-dust",
    cityId: "belltower_keep",
    harvestNodes: [
      {
        id: "bm-ore-vein",
        name: "Bellmarsh Ore Vein",
        method: "mine",
        yields: ["darksteel-ore"],
      },
      {
        id: "bm-gem-vein",
        name: "Bellmarsh Gem Vein",
        method: "mine",
        yields: ["jadeite"],
      },
      {
        id: "bm-forest",
        name: "Bellmarsh Forest",
        method: "harvest",
        yields: ["bellwood-log", "bark-strip", "bell-dust"],
      },
      {
        id: "bm-waters",
        name: "Bellmarsh Waters",
        method: "fish",
        yields: ["echo-carp", "glass-eel"],
      },
      {
        id: "bm-premium-waters",
        name: "Bellmarsh Deep Pool",
        method: "fish",
        yields: ["bell-koi"],
      },
    ],
    mobs: [
      {
        id: "bm-reptile",
        name: "Marsh Scalekin",
        tags: ["reptilian"],
        drops: ["scale-hide", "velvet-dust", "velvet-fiber", "bell-dust"],
      },
      {
        id: "bm-bat",
        name: "Cave Bell Bat",
        tags: ["beast", "flying"],
        drops: ["bat-wing", "bell-dust"],
      },
      {
        id: "bm-spectral",
        name: "Echo Wraith",
        tags: ["spectral"],
        drops: ["echo-extract", "bell-dust"],
      },
      {
        id: "bm-golem",
        name: "Bog Construct",
        tags: ["construct", "golem"],
        drops: ["metal-scrap", "velvet-dust", "velvet-fiber", "bell-dust"],
      },
      {
        id: "bm-venom",
        name: "Marsh Viper",
        tags: ["beast", "venom"],
        drops: ["poison-sac", "bell-dust"],
      },
    ],
  },

  throne_approach: {
    id: "throne_approach",
    name: "Throne Approach",
    levelBand: [81, 100],
    catalyst: "throne-dust",
    cityId: "citadel_of_kek",
    harvestNodes: [
      {
        id: "ta-ore-vein",
        name: "Throne Approach Ore Vein",
        method: "mine",
        yields: ["orichalcum-ore"],
      },
      {
        id: "ta-gem-vein",
        name: "Throne Approach Gem Vein",
        method: "mine",
        yields: ["diamond"],
      },
      {
        id: "ta-palace-ruins",
        name: "Palace Ruins",
        method: "harvest",
        yields: ["marble-chip", "tile-shard", "throne-dust"],
      },
      {
        id: "ta-forest",
        name: "Approach Wood",
        method: "harvest",
        yields: ["bark-strip"],
      },
    ],
    mobs: [
      {
        id: "ta-guardian",
        name: "Petrified Guard",
        tags: ["construct", "guardian", "elite"],
        drops: ["column-fragment", "metal-scrap", "throne-dust"],
      },
      {
        id: "ta-beast",
        name: "Approach Beast",
        tags: ["beast"],
        drops: ["horn", "throne-dust"],
      },
      {
        id: "ta-venom",
        name: "Ruin Serpent",
        tags: ["beast", "venom"],
        drops: ["poison-sac", "throne-dust"],
      },
    ],
  },
};

/** Shared hub NPC kit — every city gets these; cities may add unique quest NPCs. */
function hubNpcs(cityId: CityId, prefix: string): CityNpcDef[] {
  return [
    {
      id: `${prefix}-quest`,
      name: "Campaign Herald",
      role: "quest_giver",
      blurb: "Advances the chapter story and hands area objectives.",
    },
    {
      id: `${prefix}-job-master`,
      name: "Job Master",
      role: "job_master",
      blurb: "Change main job / unlock support job (Lv10+).",
    },
    {
      id: `${prefix}-trainer`,
      name: "Trainer",
      role: "spell_trainer",
      blurb: "Sells job abilities for Dust (500–10000).",
    },
    {
      id: `${prefix}-crafter`,
      name: "Craft Master",
      role: "crafter",
      blurb: "Opens crafting for this city's craft halls.",
    },
    {
      id: `${prefix}-vendor`,
      name: "Provisioner",
      role: "vendor",
      blurb: "Buys junk and sells basic supplies.",
    },
  ];
}

export const CITIES: Record<CityId, CityDef> = {
  shard_dwellings: {
    id: "shard_dwellings",
    name: "The Shard Dwellings",
    areaId: "pale_hollow",
    npcs: [
      ...hubNpcs("shard_dwellings", "sd"),
      {
        id: "sd-guide",
        name: "Shard Elder",
        role: "guide",
        blurb: "Tutorial guide — gathering, combat, and the road to Obsidia.",
      },
    ],
  },
  obsidia: {
    id: "obsidia",
    name: "Obsidia",
    areaId: "ashlands",
    npcs: [
      ...hubNpcs("obsidia", "ob"),
      {
        id: "ob-quest-ash",
        name: "Ash Provost",
        role: "quest_giver",
        blurb: "Ashlands chapter quests — cultists, deadwood, salt flats.",
      },
    ],
  },
  great_filter: {
    id: "great_filter",
    name: "The Great Filter",
    areaId: "slagpits",
    npcs: [
      ...hubNpcs("great_filter", "gf"),
      {
        id: "gf-quest-slag",
        name: "Filter Overseer",
        role: "quest_giver",
        blurb: "Slagpits chapter — forge pits, insects, sulfur vents.",
      },
    ],
  },
  belltower_keep: {
    id: "belltower_keep",
    name: "Belltower Keep",
    areaId: "bellmarsh",
    npcs: [
      ...hubNpcs("belltower_keep", "bk"),
      {
        id: "bk-quest-marsh",
        name: "Bell Warden",
        role: "quest_giver",
        blurb: "Bellmarsh chapter — marsh beasts, echoes, deep pools.",
      },
    ],
  },
  citadel_of_kek: {
    id: "citadel_of_kek",
    name: "Citadel of KEK",
    areaId: "throne_approach",
    npcs: [
      ...hubNpcs("citadel_of_kek", "ck"),
      {
        id: "ck-quest-throne",
        name: "Throne Seneschal",
        role: "quest_giver",
        blurb: "Finale quests — palace ruins and the Citadel clear.",
      },
      {
        id: "ck-chronomancer",
        name: "Trainer",
        role: "spell_trainer",
        blurb: "Job ability Trainer (legacy palace hall NPC id).",
      },
    ],
  },
};

export function areaForCity(cityId: CityId): AreaDef {
  return AREAS[CITIES[cityId].areaId];
}

export function cityForArea(areaId: AreaId): CityDef {
  return CITIES[AREAS[areaId].cityId];
}

/** Level-scale factor for field enemies after campaign clears. */
export function replayEnemyScale(opts: {
  playerLevel: number;
  areaId: AreaId;
  campaignClears: number;
}): number {
  const area = AREAS[opts.areaId];
  const bandMid = (area.levelBand[0] + area.levelBand[1]) / 2;
  const levelRatio = Math.max(1, opts.playerLevel / Math.max(1, bandMid));
  const clearBonus =
    Math.max(0, opts.campaignClears) * CAMPAIGN.replayScaling.clearBonusPerRun;
  return Math.min(
    CAMPAIGN.replayScaling.maxLevelScale,
    levelRatio * (1 + clearBonus),
  );
}

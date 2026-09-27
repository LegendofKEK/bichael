/**
 * Rogue kit — evasion / crit opener (jobs-from-plan §4.2).
 * Feel: fast, violet smoke, dagger crits; Ghost Step for survival, Backblade for openers.
 * No native spells — no spellbook.
 * FX: violet smoke, cut lines — not TIM teal, not Knight pale-gold.
 */

export const ROGUE_ABILITY_IDS = [
  "rest",
  "ghost_step",
  "purse_cut",
  "backblade",
  "dust_runner",
  "shadow_pass",
  "lifetap",
  "blame_shift",
  "kill_edge",
  "false_guard",
] as const;

export type RogueAbilityId = (typeof ROGUE_ABILITY_IDS)[number];

export type RogueAbilityCategory = "utility" | "ja";

export type RogueAbilityDef = {
  id: RogueAbilityId;
  label: string;
  glyph: string;
  icon?: string;
  unlockLevel: number;
  /** Rogues have no MP — always 0. */
  mp: number;
  recastMs: number;
  category: RogueAbilityCategory;
  durationMs?: number;
  range?: number;
  needsTarget?: boolean;
  weaponRequired?: boolean;
};

export const ROGUE_ABILITIES: Record<RogueAbilityId, RogueAbilityDef> = {
  rest: {
    id: "rest",
    label: "Rest",
    glyph: "Rs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 0,
    category: "utility",
  },
  ghost_step: {
    id: "ghost_step",
    label: "Ghost Step",
    glyph: "Gs",
    unlockLevel: 1,
    mp: 0,
    recastMs: 2 * 60 * 60 * 1000,
    category: "ja",
    durationMs: 30_000,
  },
  purse_cut: {
    id: "purse_cut",
    label: "Purse Cut",
    glyph: "Pc",
    unlockLevel: 5,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    range: 3,
    needsTarget: true,
    weaponRequired: true,
  },
  backblade: {
    id: "backblade",
    label: "Backblade",
    glyph: "Bb",
    unlockLevel: 15,
    mp: 0,
    recastMs: 60_000,
    category: "ja",
    durationMs: 30_000,
  },
  dust_runner: {
    id: "dust_runner",
    label: "Dust Runner",
    glyph: "Dr",
    unlockLevel: 25,
    mp: 0,
    recastMs: 45_000,
    category: "ja",
    durationMs: 30_000,
  },
  shadow_pass: {
    id: "shadow_pass",
    label: "Shadow Pass",
    glyph: "Sp",
    unlockLevel: 30,
    mp: 0,
    recastMs: 60_000,
    category: "ja",
    durationMs: 30_000,
  },
  lifetap: {
    id: "lifetap",
    label: "Lifetap",
    glyph: "Lt",
    unlockLevel: 40,
    mp: 0,
    recastMs: 15 * 60_000,
    category: "ja",
    range: 3,
    needsTarget: true,
    weaponRequired: true,
  },
  blame_shift: {
    id: "blame_shift",
    label: "Blame Shift",
    glyph: "Bs",
    unlockLevel: 50,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
  },
  kill_edge: {
    id: "kill_edge",
    label: "Kill Edge",
    glyph: "Ke",
    unlockLevel: 60,
    mp: 0,
    recastMs: 5 * 60_000,
    category: "ja",
    durationMs: 30_000,
  },
  false_guard: {
    id: "false_guard",
    label: "False Guard",
    glyph: "Fg",
    unlockLevel: 75,
    mp: 0,
    recastMs: 2 * 60_000,
    category: "ja",
    durationMs: 30_000,
    range: 8,
    needsTarget: true,
  },
};

export const ROGUE_ABILITY_BLURBS: Record<RogueAbilityId, string> = {
  rest: "Kneel to recover HP. Breaks on damage or move.",
  ghost_step: "2-hour: violet smoke — enemies lose you and stop chasing; melee misses for 30s.",
  purse_cut: "Slip a hand into their purse — steal Dust.",
  backblade: "Ready a backstrike — your next hit is a guaranteed critical.",
  dust_runner: "Sprint through ash — move speed +50% for 30s.",
  shadow_pass: "Next hit dumps your enmity (passes hate in a party).",
  lifetap: "Cut and drink — steal HP from the target.",
  blame_shift: "Shed hate — clear your enmity (or pass it to an ally).",
  kill_edge: "Honered edge — next hit crits hard and refunds some TP.",
  false_guard: "Feint their guard open — enemy easier to hit for 30s.",
};

export const ROGUE_CATEGORY_TABS: { id: RogueAbilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ja", label: "Job" },
  { id: "utility", label: "Utility" },
];

export function isRogueAbilityId(id: string): id is RogueAbilityId {
  return Object.prototype.hasOwnProperty.call(ROGUE_ABILITIES, id);
}

export function rogueAbilitiesUnlocked(level: number): RogueAbilityId[] {
  return ROGUE_ABILITY_IDS.filter((id) => ROGUE_ABILITIES[id].unlockLevel <= level);
}

export function rogueHotbarOrder(unlocked: readonly RogueAbilityId[]): RogueAbilityId[] {
  const prefer: RogueAbilityId[] = [
    "backblade",
    "shadow_pass",
    "ghost_step",
    "dust_runner",
    "purse_cut",
    "lifetap",
    "kill_edge",
    "false_guard",
    "blame_shift",
  ];
  const set = new Set(unlocked);
  const out: RogueAbilityId[] = [];
  for (const id of prefer) {
    if (set.has(id)) out.push(id);
  }
  for (const id of unlocked) {
    if (id === "rest") continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function rogueAbilityTooltip(id: RogueAbilityId): {
  title: string;
  body: string;
  meta: string;
} {
  const def = ROGUE_ABILITIES[id];
  const bits: string[] = [`Lv ${def.unlockLevel}`];
  bits.push("No MP");
  if (def.recastMs > 0) {
    const s = def.recastMs / 1000;
    bits.push(s >= 3600 ? `CD ${Math.round(s / 3600)}h` : s >= 60 ? `CD ${Math.round(s / 60)}m` : `CD ${s}s`);
  }
  if (def.durationMs) bits.push(`Dur ${def.durationMs / 1000}s`);
  if (def.needsTarget) bits.push("Target");
  if (def.weaponRequired) bits.push("Dagger");
  return { title: def.label, body: ROGUE_ABILITY_BLURBS[id], meta: bits.join(" · ") };
}

export function rogueAbilityIconUrl(id: RogueAbilityId | string): string {
  if (isRogueAbilityId(id) && ROGUE_ABILITIES[id].icon) return ROGUE_ABILITIES[id].icon!;
  return `/icons/abilities/${id}.png`;
}

/** Bellgrave jobs — TIM is fully playable; others selectable later via Job Master. */

export const JOB_IDS = [
  "time_mage",
  "knight",
  "rogue",
  "cleric",
  "sorcerer",
  "fighter",
  "battle_mage",
] as const;

export type JobId = (typeof JOB_IDS)[number];

export type JobDef = {
  id: JobId;
  name: string;
  /** If false, Job Master shows it as coming soon. */
  playable: boolean;
  blurb: string;
};

export const JOBS: Record<JobId, JobDef> = {
  time_mage: {
    id: "time_mage",
    name: "Time Mage",
    playable: true,
    blurb: "Tempo, Flux, and chronomancy — haste the party, enfeeble the hall.",
  },
  knight: {
    id: "knight",
    name: "Knight",
    playable: true,
    blurb: "Shield tank — Provoke, Flash, Bulwark. Hold the line.",
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    playable: true,
    blurb: "Ghost Step to slip blows; Backblade for crit openers — violet smoke and daggers.",
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    playable: true,
    blurb: "Sacred Mercy, Ashmend, and Sunrise Recall — white light and sky-blue wards.",
  },
  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    playable: true,
    blurb: "Violet neve and elemental lances — stand back and burn with Arcane Flood.",
  },
  fighter: {
    id: "fighter",
    name: "Fighter",
    playable: true,
    blurb: "Two-hander physical DPS — Berserk, Killing Storm, Warcry. Iron and oxblood.",
  },
  battle_mage: {
    id: "battle_mage",
    name: "Battle Mage",
    playable: true,
    blurb: "Hybrid blade and en-spells — teal runes between casts, Refresh support.",
  },
};

export function isJobId(v: string): v is JobId {
  return (JOB_IDS as readonly string[]).includes(v);
}

/** Melee swing SFX family — staff casters vs blade jobs. */
export type JobWeapon = "staff" | "sword";

export const JOB_WEAPON: Record<JobId, JobWeapon> = {
  time_mage: "staff",
  cleric: "staff",
  sorcerer: "staff",
  knight: "sword",
  rogue: "sword",
  fighter: "sword",
  battle_mage: "sword",
};

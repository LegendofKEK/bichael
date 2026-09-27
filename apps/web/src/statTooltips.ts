import type { AttrKey, JobId } from "@bellgrave/combat";

/**
 * Character-menu copy for the six attributes.
 * Each line matches a live combat formula — unused stats say so.
 */
export const STAT_TOOLTIPS: Record<JobId, Record<AttrKey, string>> = {
  time_mage: {
    str: "Outside Flux, staff swings are a tenth of Strength. Weapon skills still use full Strength.",
    dex: "Dexterity is your chance to land a staff swing.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your staff swings.",
    int: "Intelligence adds to T. Distortion. It does not affect your other spells yet.",
    mnd: "In Flux, Mind is your melee attack. Cures, Dispel, and T. Distortion scale with it too.",
  },
  knight: {
    str: "Sword swings and weapon skills scale with Strength. Buckler Crash and Ashlight take a share of it.",
    dex: "Dexterity is your chance to land a swing.",
    vit: "Vitality is Defense. Buckler Crash also hits a little harder with it.",
    agi: "Agility is Evasion, and it raises the crit rate of your sword swings.",
    int: "Intelligence does not affect your skills yet.",
    mnd: "Mind powers Ashmend healing and Ashlight.",
  },
  rogue: {
    str: "Dagger swings, Lifetap, and weapon skills scale with Strength.",
    dex: "A quarter of Dexterity is added to dagger damage. It is also your accuracy, and Backblade hits harder with it.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your dagger swings.",
    int: "Intelligence does not affect your strikes yet.",
    mnd: "Mind does not affect your strikes yet.",
  },
  cleric: {
    str: "Staff swings and weapon skills use Strength. A deep Strength deficit glances instead of hitting for 1.",
    dex: "Dexterity is your chance to land a staff swing.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your staff swings.",
    int: "Intelligence does not affect your spells yet.",
    mnd: "Mind powers Ashmend healing and Daybreak Ray.",
  },
  sorcerer: {
    str: "Staff swings and weapon skills use Strength. A deep Strength deficit glances instead of hitting for 1.",
    dex: "Dexterity is your chance to land a staff swing.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your staff swings.",
    int: "Intelligence is most of your elemental spell damage, and Mana Siphon drains more with it.",
    mnd: "Mind adds a small share of elemental spell damage.",
  },
  fighter: {
    str: "Greatsword swings and weapon skills scale with Strength.",
    dex: "Dexterity is your chance to land a swing.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your greatsword swings.",
    int: "Intelligence does not affect your strikes yet.",
    mnd: "Mind does not affect your strikes yet.",
  },
  battle_mage: {
    str: "Blade swings and weapon skills scale with Strength. Elemental nukes take a small share of it.",
    dex: "Dexterity is your chance to land a swing.",
    vit: "Vitality is Defense, so physical blows hurt less.",
    agi: "Agility is Evasion, and it raises the crit rate of your blade swings.",
    int: "Intelligence powers elemental nukes, en-spell hits, Stoneskin Rune, Spore Thread, and Rune Collapse.",
    mnd: "Mind powers Threadmend healing.",
  },
};

export function statTooltip(job: JobId, attr: AttrKey): string {
  return STAT_TOOLTIPS[job][attr];
}

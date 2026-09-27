---
name: jobs-from-plan
description: >-
  Locked Bellgrave job designs from the original plan — grades, spells, JAs,
  role chart, and FX motifs. Use with bellgrave-job-creation when implementing
  Knight, Rogue, Cleric, Sorcerer, Fighter, or Battle Mage.
---

# Bellgrave jobs — design lock (from plan)

Implement these as **full original jobs**. Time Mage detail lives in [reference-time-mage.md](reference-time-mage.md) + combat `tim-kit.ts`. Cap **75** all jobs.

## Roster

| ID | Job | Fantasy | Primary stats | Implement phase |
|----|-----|---------|---------------|-----------------|
| 1 | Knight | Shield tank | VIT, STR | V3 |
| 2 | Rogue | Crit / evasion | DEX, AGI | V3 |
| 3 | Cleric | Primary healer | MND, VIT | V3 |
| 4 | Sorcerer | Elemental DPS | INT | V3 |
| 5 | Fighter | Physical DPS | STR, DEX | V3 |
| 6 | Battle Mage | Sword + elemental hybrid | STR, INT | V3 |
| 7 | Time Mage | Tempo + Flux MND staff | MND, AGI, INT | v1 (live) |

### Shared rules

- Each job has a **2HR at Lv1** (2 h recast).  
- Weapons gated by job skill ranks.  
- Ideal party core: Knight + Cleric + Fighter/Rogue + Sorcerer/Battle Mage + Time Mage (+ flex).

### Role chart (do not blur)

| Need | Best | Backup |
|------|------|--------|
| Tank hate | Knight | Fighter Provoke |
| Healing / Raise / -na | Cleric | Battle Mage Cure; TIM Cure weak |
| Tempo haste + movespeed | **Time Mage** | Cleric/Battle Mage Haste (weaker) |
| Enfeeble AoEs / Dispelga | **Time Mage** | Battle Mage single targets |
| Elemental DPS | Sorcerer | Battle Mage |
| Physical DPS | Fighter | Rogue burst |
| Evasion scout | Rogue | — |
| Refresh | Battle Mage | — |

---

## 4.1 Knight — shield tank

**Fantasy:** Frontliner who holds enmity, blocks with shield, spot-heals. Not a DPS.

**Grades:** HP **A**, MP **E**, STR **B**, DEX **D**, VIT **A**, AGI **E**, INT **E**, MND **C**

**Skills:** Sword **A+**, Club **B**, Great Sword **B**, Shield **A+**, Parrying **B**, Evasion **C**, Divine **C**, Healing **D**, Enhancing **D**

**Traits (design):** Defense Bonus line, Shield Mastery, Max HP Boost, modest Attack Bonus, light Clear Mind

**Spells (sparse divine):**

| Lv | Spell |
|----|-------|
| 5 | Cure |
| 7 | Banish |
| 17 | Protect |
| 20 | Flash (blind + high enmity) |
| 30 | Cure II |
| 34 | Shell |
| 37 | Protect II |
| 45 | Cure III |
| 47 | Shell II |
| 55 | Protect III |
| 57 | Shell III |
| 65 | Cure IV |
| 70 | Banish II |
| 75 | Holy (single nuke, high enmity) |

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Bulwark** (2HR) | 2 h | 30s physical damage taken −100% (magic still hits) |
| 5 | Provoke | 30s | Spike enmity on target |
| 15 | Shield Bash | 60s | Stun + shield damage |
| 25 | Cover | 3 min | Take hits for party member 15s |
| 35 | Rampart | 5 min | Party physical DT −25% for 30s |
| 45 | Sentinel | 5 min | Self DT −50%, enmity+ 30s |
| 55 | Fealty | 10 min | Strong magic defense / resist 60s |
| 65 | Chivalry | 10 min | Convert TP → MP |
| 75 | Guardian | 20 min | Cover entire party 20s |

**Style:** Heavy plate, shield + sword; steel/charcoal/crimson; modest cape. Seed `bellgrave-93471-knight`.  
**FX motifs:** Silver flash, crimson shield, holy pale-gold — **not** Cleric sky-blue, **not** TIM teal.

**Play:** Sword + shield. Flash/Provoke hold hate.

---

## 4.2 Rogue — evasion / crit

**Fantasy:** High evasion, burst windows, utility openers. Light armor.

**Grades:** HP **D**, MP **—** (none), STR **C**, DEX **A**, VIT **D**, AGI **A**, INT **D**, MND **E**

**Skills:** Dagger **A+**, Sword **B**, Throwing **B**, Evasion **A+**, Parrying **A**

**Traits:** Critical Attack Bonus, Evasion Bonus, Triple Attack (late), Treasure Hunter, Gilfinder (Dust+)

**No native spells.** No spellbook UI.

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Ghost Step** (2HR) | 2 h | 30s all melee swings against you miss |
| 5 | Steal | 5 min | Attempt steal Dust/item |
| 15 | Sneak Attack | 1 min | Next hit crit + DEX WSC |
| 25 | Flee | 5 min | Move +50% 30s |
| 30 | Trick Attack | 1 min | Next hit transfers enmity to front ally |
| 40 | Mug | 15 min | Steal HP |
| 50 | Accomplice / Collaborator | 5 min | Pass enmity to ally |
| 60 | Assassin’s Charge | 5 min | Next WS +crit / TP refund |
| 75 | Feint | 2 min | Enemy Eva −50 for 30s |

**Style:** Light armor, daggers; deep purple/brown/black; hood/scarf/pouches. Seed `bellgrave-93471-rogue`.  
**FX motifs:** Violet smoke, cut lines — **no** big magic circles.

**Play:** Dagger. SA+TA spike. Ghost Step for survival.

---

## 4.3 Cleric — primary healer

**Fantasy:** Best cures, status removal, Raise. Soft defense buffs. Weak melee.

**Grades:** HP **E**, MP **B**, STR **D**, DEX **E**, VIT **C**, AGI **D**, INT **D**, MND **A**

**Skills:** Club **B**, Staff **C**, Healing **A+**, Divine **A**, Enhancing **B**, Enfeebling **D**, Evasion **D**

**Traits:** Clear Mind, Max MP, Magic Defense Bonus, Auto Regen (late), Divine Veil

**Spells (core lines):**

| Line | Levels (approx) |
|------|-----------------|
| Cure I–V | 1 / 11 / 21 / 41 / 61 |
| Curaga I–III | 16 / 40 / 60 |
| Raise / Raise II / Reraise | 25 / 50 / 33 |
| -na (Poisona, Paralyna, Blindna, Silena, Viruna, Stona, Cursna) | 10–50 |
| Erase | 45 |
| Regen I–III | 21 / 44 / 66 |
| Protect / Shell (+ra) | 10–75 |
| Haste | 40 |
| Banish / Holy | undead tools |
| Slow / Paralyze / Silence | light enfeebles |
| Flash | 45 |

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Sacred Mercy** (2HR) | 2 h | Party full HP + erase most statuses |
| 15 | Divine Seal | 10 min | Next cure/banish ×2 |
| 30 | Solace Rite | toggle | Cures also grant absorb shield |
| 40 | Martyr | 10 min | Sacrifice HP to heal ally |
| 50 | Misery Rite | toggle | Enfeebles empowered after damage taken |
| 60 | Devotion | 10 min | Give MP to ally from your HP |
| 75 | Asylum | 20 min | Party magic DT − 30s |

**Style:** Vestments, mace/staff; white/sky blue/soft gold; bell or broken-sun mark. Seed `bellgrave-93471-cleric`.  
**FX motifs:** White / sky blue / soft gold — Raise = rising light column. Distinct from Knight pale-gold wards.

**Play:** Main healer. Owns Raise / -na.

---

## 4.4 Sorcerer — elemental nuker

**Fantasy:** Black magic DPS. Squishy. Burn windows. Staff.

**Grades:** HP **F**, MP **A**, STR **E**, DEX **C**, VIT **E**, AGI **C**, INT **A**, MND **D**

**Skills:** Staff **A+**, Club **C**, Elemental **A+**, Dark **B**, Enfeebling **C**, Evasion **D**

**Traits:** Magic Attack Bonus, Clear Mind, Conserve MP, Magic Burst Bonus (if skillchains), light Fast Cast

**Spells:** Elemental tiers I–IV for Stone/Water/Aero/Fire/Blizzard/Thunder (+ ga/aja at high levels); Sleep/Sleepga; Blind; Bind; Dispel; Drain/Aspir; Warp/Escape; Stun (Dark).

Example Fire curve: Fire 13, Fire II 38, Fire III 62, Fire IV 73; Firaga 28, Firaga II 53, Firaga III 69.

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Arcane Flood** (2HR) | 2 h | 60s cast without MP cost; uninterruptible |
| 15 | Elemental Seal | 10 min | Next elemental +MACC heavily |
| 30 | Mana Wall | 5 min | HP absorbs magic damage inverse |
| 40 | Manawell | 5 min | Next spell free MP |
| 50 | Enmity Douse | 3 min | Clear self enmity |
| 60 | Cascade | 5 min | Next skillchain/MB window bonus |
| 75 | Focal Neve | 20 min | Self INT +40 / MAB +20 for 60s |

**Style:** Caster robes, staff orb; violet/deep blue/wine; rune hems. Seed `bellgrave-93471-sorcerer`.  
**FX motifs:** Violet/blue + per-element nuke colors. Not Battle Mage teal-bronze.

**Play:** Stand back. Nuke. Arcane Flood burn.

---

## 4.5 Fighter — raw melee DPS

**Fantasy:** Highest physical output, WS focus, two-hander. Minimal magic.

**Grades:** HP **B**, MP **—**, STR **A**, DEX **B**, VIT **C**, AGI **C**, INT **E**, MND **E**

**Skills:** Great Axe **A+**, Axe **A**, Great Sword **A**, Sword **B**, Polearm **B**, Evasion **C**, Parrying **C**

**Traits:** Double Attack, Attack Bonus, Crit Bonus (late), Max HP, modest Store TP

**No native spells.**

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Killing Storm** (2HR) | 2 h | 45s all melee hits critical |
| 5 | Berserk | 5 min | Att +25%, Def −25% for 180s |
| 15 | Warcry | 5 min | Party Att + 30s |
| 25 | Defender | 3 min | Def +, Att − |
| 35 | Aggressor | 5 min | Acc +, Eva − |
| 45 | Provoke | 30s | Enmity spike (off-tank) |
| 55 | Restraint | 10 min | WS TP bonus build |
| 65 | Blood Rage | 10 min | Party crit window |
| 75 | Brazen Rush | 20 min | Double Attack rate surge 30s |

**Style:** Two-hander DPS; iron grey/oxblood/leather; no oversized ceremonial cape. Seed `bellgrave-93471-fighter`.  
**FX motifs:** Iron sparks, blood-red rage — **no** magic circles.

**Play:** Great Axe / GS. Berserk + Killing Storm = peak physical burst.

---

## 4.6 Battle Mage — sword + elemental hybrid

**Fantasy:** Midline caster-melee. En-spells, convert, flexible kit. Not best healer, nuker, or tempo job.

**Grades:** HP **D**, MP **C**, STR **C**, DEX **C**, VIT **D**, AGI **D**, INT **B**, MND **C**

**Skills:** Sword **A**, Club **B**, Dagger **C**, Elemental **B**, Enfeebling **B**, Enhancing **B**, Healing **C**, Dark **D**, Evasion **C**, Shield **C**

**Traits:** Strong Fast Cast, mid MAB, Clear Mind, Sword+Shield default, Convert line

**Spells (hybrid):**

| Role | Spells |
|------|--------|
| En-spells | Flame Edge → Thunder Edge (weapon elemental) |
| Nukes | Elemental I–III (no IV; limited ga) |
| Enfeebles | Dia, Bio, Slow, Paralyze, Silence, Blind, Gravity, Dispel, Bind, Sleep |
| Enhancing | Protect/Shell, Phalanx, Stoneskin, Haste, Refresh (single ~40) |
| Healing | Cure I–IV (weaker than Cleric) |

**Job abilities:**

| Lv | Ability | Recast | Effect |
|----|---------|--------|--------|
| 1 | **Spellblade** (2HR) | 2 h | 60s spells cast 0 / recast 0 (anim lock remains) |
| 15 | Convert | 10 min | Swap HP ↔ MP |
| 25 | Corrupt | 5 min | Next enfeeble potency/duration + |
| 35 | Focus Weave | toggle | Self enhance duration × |
| 45 | Spontaneity | 10 min | Next spell instant |
| 55 | Lockspell | 15 min | Next enfeeble nearly unresistable |
| 65 | Corrupt II / Widen | 10 min | Next enhance becomes AoE |
| 75 | Full Circle | 20 min | Dump en-spell into burst nuke |

**Style:** Gauntlets + tunic/half-robe + sword; teal/steel/bronze. Seed `bellgrave-93471-battlemage`.  
**FX motifs:** Teal-bronze blade runes — distinct from Sorcerer violet and TIM chrona.

**Play:** Sword + en-spell between casts. Refresh support. Spellblade for emergency casts.

---

## 4.7 Time Mage

Full kit implemented — see [reference-time-mage.md](reference-time-mage.md). Grades: HP C, MP C, STR E, DEX C, VIT D, AGI B, INT B, MND B. Dual stances Flux / Aether. Tempo line owns magical haste identity.

---

## FX motif quick map

| Job | Seed | Motifs |
|-----|------|--------|
| Knight | `…-knight` | Silver flash, crimson shield, pale-gold divine |
| Rogue | `…-rogue` | Violet smoke, cut lines |
| Cleric | `…-cleric` | White, sky blue, soft gold, bell/sun |
| Sorcerer | `…-sorcerer` | Violet/blue, per-element nuke colors |
| Fighter | `…-fighter` | Iron sparks, blood-red rage |
| Battle Mage | `…-battlemage` | Teal-bronze, blade runes |
| Time Mage | `…-timemage` | Dust gold, ash, deep teal, clock-bronze, orbital rings |

When implementing VFX for a JA/spell, invent layers that match **that** row — never default to TIM orb belts or Flux fringe.

---
name: bellgrave-job-creation
description: >-
  Fully create Bellgrave jobs from the original seven-job plan: unique sprites,
  animations, job abilities, spells (if any), combat feel, and VFX. Use when
  building Knight, Rogue, Cleric, Sorcerer, Fighter, Battle Mage, or Time Mage;
  when fleshing a job kit; or when the user asks to implement a planned job.
---

# Bellgrave job creation

**Goal:** ship each planned job as its **own** identity — not a Time Mage clone with swapped colors.

Create the full vertical slice for that job:

1. Fantasy + grades + weapons  
2. Full JA + spell lists (or explicit “no spells”)  
3. Unique sprite set + animations  
4. Unique world VFX / feel  
5. Server kit + HUD + Job Master playable flag  

**Source of truth for kits:** [jobs-from-plan.md](jobs-from-plan.md) (Bellgrave plan §4 + FX motifs).  
**TIM as engineering reference only:** [reference-time-mage.md](reference-time-mage.md) — packages, unlocks, Job Master, hotbar/spellbook wiring. Do **not** copy TIM abilities, Flux/Aether, Quicken orbs, or chrona motifs onto other jobs.  
**Sprites pipeline:** `.cursor/skills/bellgrave-sprites/SKILL.md`.

Do **not** use trademarked game names in prompts, UI, or comments.

---

## The seven jobs (original plan)

| Job | Fantasy | Primary stats | Magic? | Signature 2HR |
|-----|---------|---------------|--------|----------------|
| **Knight** | Shield tank, enmity | VIT, STR | Sparse divine / cure / protect | **Bulwark** |
| **Rogue** | Crit / evasion / openers | DEX, AGI | **None** | **Ghost Step** |
| **Cleric** | Primary healer / Raise / -na | MND, VIT | Large heal / divine kit | **Sacred Mercy** |
| **Sorcerer** | Elemental nuker | INT | Full elemental tiers | **Arcane Flood** |
| **Fighter** | Raw melee / WS | STR, DEX | **None** | **Killing Storm** |
| **Battle Mage** | Sword + en-spell hybrid | STR, INT | Mid nukes / enfeebles / enhance / cure | **Spellblade** |
| **Time Mage** | Tempo + Flux MND staff | MND, AGI, INT | Time / enhance / enfeeble / light cure | **Temporal Distortion** |

Cap **75**. Party niches must stay distinct — see role chart in `jobs-from-plan.md`. TIM owns tempo haste + chrona enfeeble AoEs; Cleric owns Raise/-na; Sorcerer owns heavy nukes; etc.

---

## Non-negotiable: unique look **and** feel

Every job must pass this test: *if you strip the job name from the UI, a player can still tell who they are from silhouette, weapons, combat rhythm, and VFX.*

| Layer | Must differ across jobs |
|-------|-------------------------|
| **Silhouette** | Armor / robe / weapon silhouette readable at isometric distance |
| **Palette + motifs** | Per style card + seed (`bellgrave-93471-{job}`) |
| **Anims** | Idle / walk / melee (and cast / rest when that job uses them) — pose language matches the fantasy (tank brace vs dagger poke vs two-hander swing vs cast) |
| **Combat rhythm** | Melee-only vs cast-heavy vs hybrid; TP vs MP pressure; stance toggles only if designed for that job |
| **Ability kit** | JAs + spells from the plan — not TIM Quicken/Slow renamed |
| **Ability icons** | Fantasy art gens **or shared spell icons** (`SHARED_ABILITY_ICON`) — never regenerate Cure/Protect/etc. per job; JA icons unique |
| **World VFX** | Motifs from plan §3.5 per job (Knight silver/crimson ward ≠ TIM teal chrona orbs ≠ Rogue violet smoke) |
| **Audio/log voice** | Short combat logs that sound like that job |

**Forbidden “clone” patterns**

- Reskin TIM sprites (same robe/staff pose, recolor).  
- Reuse Flux silhouette + Quicken dual-orb belts as the default buff VFX for every job.  
- Give every job haste/slow/gravity “because TIM had them.”  
- Copy TIM hotbar order / stance UX onto jobs that don’t have dual stances.  
- One shared “caster cast” pose for Knight Flash and Sorcerer Fire IV.

---

## Creation checklist (mandatory order)

Do **one job at a time** until playable. Skip nothing that applies.

### A. Design lock (before art or code)

1. Read that job’s section in [jobs-from-plan.md](jobs-from-plan.md).  
2. Write / confirm **style card**: role look, palette, motifs, avoids, seed.  
3. Confirm **grades**, weapon skills, traits (MVP can stub traits as combat modifiers later).  
4. Lock **JA table** + **spell list** (or “no spells”). Assign `id` slugs, unlock levels, MP, recast, durations.  
5. Sketch **feel thesis** in one sentence (e.g. “Knight is slow, loud, shield-forward; hate tools first”).  
6. List **signature VFX** (at least 2HR + one signature JA/spell) with motifs that are *not* TIM’s.  
6b. Plan **ability icons** — one fantasy icon motif per ability id (same job seed/palette); no letter-tile placeholders.

### B. Art (bellgrave-sprites)

7. Generate + approve **SE idle** for that job.  
8. Idle + walk **n/ne/e/se/s**; melee SE (cast SE if caster; rest if that job rests).  
9. Bake magenta chroma; wire `{job}SpriteUrl` + preload list in `facing.ts`.  
10. World billboard path selects sprites by `you.job` (not always TIM).  
10b. Generate **ability icons** (`apps/web/public/icons/abilities/{id}.png`) — square 1:1 fantasy art, solid `#FF00FF` BG, bake chroma; HUD uses icons (glyph text is fallback only). See ability-icon section in `bellgrave-sprites/SKILL.md`.

### C. Combat data + server

11. `{job}-kit.ts` in `packages/combat` — full ability defs + unlocks + hotbar order.  
12. `{JOB}_L1` (or grade-driven) stats.  
13. Protocol: union new ability IDs into `AbilityId`; extend `BuffState` only for buffs this job needs.  
14. `apps/server/src/{job}-abilities.ts` resolver; `handleAbility` dispatches on `p.job`.  
15. Starter gear for that job if needed; Job Master `playable: true` when the slice works.

### D. Client feel

16. HUD: hotbar from that job’s unlocks; spellbook only if the job has many spells.  
17. Unique active/CD presentation where it matters (stance pulse ≠ rogue SA mark).  
18. World VFX hooks for signature abilities (new motifs — do not paste TIM orb belts).  
19. EquipPanel / status show correct job name + relevant stance/stats.  
20. Playtest: Job Master → this job → engage Guard → kit reads unique → rest/potion if applicable.

---

## Stack (wiring — shared)

| Layer | Path | Role |
|-------|------|------|
| Config | `packages/config` | Tick, hall, speeds, item IDs |
| Protocol | `packages/protocol` | Messages, `AbilityId`/`JobId`, buffs, NPC dialog |
| Combat | `packages/combat` | `JOBS`, per-job kits + stats |
| Server | `apps/server/src` | Per-job resolvers, sim, Job Master |
| Web | `apps/web` | Sprites by job, Hud, VFX, EquipPanel |

TIM shows *how* kits unlock and snapshot; each new kit is **original content**.

### Kit file pattern

```ts
// packages/combat/src/knight-kit.ts  (example)
export const KNIGHT_ABILITY_IDS = [ "bulwark", "provoke", "flash", ... ] as const;
export const KNIGHT_ABILITIES: Record<..., Def> = { /* plan tables */ };
export function knightAbilitiesUnlocked(level: number): ...;
export function knightHotbarOrder(level: number): ...;
```

Union all job ability IDs into protocol `AbilityId`. Snapshot `you.unlocked` comes from the **current job’s** unlock helper.

### Server pattern

```ts
switch (p.job) {
  case "time_mage": resolveTimAbility(...); break;
  case "knight": resolveKnightAbility(...); break;
  // ...
  default: pushLog(p, "No abilities for this job yet.");
}
```

Clear job-specific buffs on `job/change`.

### Client sprite pattern

```ts
function playerSpriteUrl(job: JobId, anim, facing) {
  switch (job) {
    case "time_mage": return timSpriteUrl(...);
    case "knight": return knightSpriteUrl(...);
    // each job has its own URL map + preload list
  }
}
```

---

## Feel rules (per job, not TIM-generic)

1. **Readable numbers** — haste, DT, crit windows, move buffs must be large enough to perceive.  
2. **Signature VFX first** — 2HR and one bread-and-butter ability must read at isometric scale before polishing every spell.  
3. **Motif discipline** — stick to that job’s seed/palette; don’t mix chrona teal into Knight wards or Cleric bells into Sorcerer nukes.  
4. **Anim matches verb** — Shield Bash is a shield slam, not a staff cast reuse.  
5. **Role honesty** — Knight should not out-nuke Sorcerer; Rogue has no MP bar / no spellbook; Fighter stays physical.

---

## Done when (single job)

- [ ] Kit matches plan fantasy (JAs + spells or explicit none)  
- [ ] Grades / L1 stats in combat package  
- [ ] Unique sprites: idle+walk dirs + melee (+ cast/rest if needed)  
- [ ] Facing wired; no walk flicker  
- [ ] Ability icons: fantasy PNG + chroma bake for every ability id  
- [ ] Server resolver + unlocks in snapshot  
- [ ] Hotbar (and spellbook if needed) for this job only  
- [ ] ≥1 signature world VFX that is **not** a TIM reuse  
- [ ] Job Master can select it (`playable: true`)  
- [ ] Playtest: looks and *plays* different from TIM and from other live jobs  

---

## Anti-patterns

- “Clone TIM then rename abilities.”  
- Shared generic VFX library as the only job identity.  
- Letter-glyph or flat SVG shapes as the primary ability icons (use fantasy chroma-keyed art).  
- Trademarked MMO names in player-facing text.  
- Hardcoding one job’s ability list in Hud for every job.  
- Job swap without clearing that job’s buffs/recasts.  
- Skipping SE idle approval and generating all dirs blind.

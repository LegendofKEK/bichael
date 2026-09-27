---
name: reference-time-mage
description: >-
  Time Mage implementation inventory (wiring + live kit). Engineering reference
  for packages/server/HUD — not a template to reskin into other jobs. For creating
  Knight/Rogue/Cleric/etc., use SKILL.md + jobs-from-plan.md.
---

# Time Mage — what we built (engineering reference)

**Use this to wire systems** (unlocks, snapshots, Job Master, hotbar).  
**Do not** copy TIM fantasy, abilities, or VFX onto other jobs — those come from [jobs-from-plan.md](jobs-from-plan.md) and must look/feel unique.

Original Bellgrave TIM; no trademarked names in UI.

## Identity

| Field | Value |
|-------|--------|
| Job id | `time_mage` (`JOBS.time_mage`, playable) |
| Seed | `bellgrave-93471-timemage` |
| Palette | Dust gold, pale ash, deep teal, clock-bronze |
| Motifs | Hourglass, orbital-ring staff, Flux melee robe cut |
| Starter | Ashbeam Staff, Linen Robe, Potion×3 |
| Zone | Palace hall greybox (`HALL`), Petrified Guard |
| Job change | Job Master NPC (`npc-job-master`) near entrance (−6, 18) |

## Stats (`TIM_L1`)

STR 6 · DEX 10 · VIT 8 · AGI 12 · INT 11 · MND 14  

- **Flux** → Attack from **MND**; +move (`PLAYER_SPEED_FLUX`); +TP/tick; teal aura.  
- **Aether** → Magic amp; melee suppressed; lilac tint. Mutual exclusion with Flux.  
- Unstanced → STR × **0.1**.

## Ability kit (`packages/combat/src/tim-kit.ts`)

Source of truth: `TIM_ABILITY_IDS` / `TIM_ABILITIES` with `unlockLevel`. Snapshot `you.unlocked` = `timAbilitiesUnlocked(level)`. Hotbar = `timHotbarOrder(level)` (first 10 → keys 1–9, 0). Spellbook (K) casts any unlocked.

| Family | IDs (abbrev) | Notes |
|--------|----------------|-------|
| Stances | `flux`, `aether` | Staff required; 30s recast; mutual exclusive |
| Utility | `rest` | Kneel HP/MP regen, TP drain |
| Time (haste) | `quicken` → `quicken_ii`, `tempo` → `tempo_ii`, `allegro` → `allegro_ii` | Self/`hastePct`; higher overwrites; drives orb VFX via `quickenUntil` |
| Enhance | `haste`, `hastega` | Magical haste line |
| Enfeeble | `slow`/`slow_ii`/`slowga`, `gravity`/`_ii`/`ga`, `bind`/`bindga`, `dispel`/`dispelga`, `distract`/`_ii`, `frazzle`, `addle`, `paralyga`, `silencega` | Guard debuffs; Metronome repeats last |
| Heal | `cure` → `cure_iv` | Self heal, Aether slight amp |
| JA | `temporal_distortion`, `metronome`, `split_second`, `overclock`, `time_seal`, `clockwind`, `perpetual_motion` | TD can kill + rewards; Metronome free MP |

Resolver: `apps/server/src/tim-abilities.ts` (`resolveTimAbility`).

## Movement & combat loop

- WASD + click-to-move; engage chase to ~0.85× melee.  
- Auto-attack while engaged (blocked in Aether).  
- Haste from any time/enhance buff via `playerHastePct`.  
- Guard respects Slow/Gravity move, Bind/Stun/Petrify freeze, Paralyze skip chance.  
- Kill → +25 Dust, +40 XP (`rewardGuardKill`).

## Progression

- `xpToNextLevel(level) = 50 + level * 50`.  
- Level-up spends XP remainder, +max HP/MP, VFX window.  
- New abilities unlock automatically by level (no trainer grind in MVP).

## Job Master

- Snapshot unit `kind: "npc"`, `npcRole: "job_master"`.  
- Click → `npc/interact` → `npc/dialog` with all `JOB_IDS`.  
- `job/change` only if in range + `JOBS[job].playable`.  
- Clears stances/buffs/recasts on swap.

## Sprites (`apps/web/public/sprites`)

| Asset | Role |
|-------|------|
| `tim-idle-{n,ne,e,se,s}.png` | Idle 5-dir |
| `tim-walk-{n,ne,e,se,s}.png` | Walk 5-dir |
| `tim-melee-v3.png` | Melee (SE, mirrored) |
| `tim-cast-v2.png` | Cast |
| `tim-rest-v1.png` | Rest kneel |
| `fx-flux-aura-v1.png` | Flux fringe |
| `guard-idle-v2.png` / `guard-melee-v2.png` | Guard |
| `hall-floor.png` | Floor |

Job Master uses a simple capsule mesh (no sprite yet).

## Client systems

| File | Responsibility |
|------|----------------|
| `facing.ts` | DirKey, facingPick + hysteresis, timSpriteUrl |
| `chroma.ts` | Magenta / hot-pink key |
| `WorldScene.tsx` | Hall, billboards, Flux/Quicken/level-up VFX, Job Master mesh |
| `Hud.tsx` | Vitals, unlocked hotbar, spellbook, Job Master dialog, log |
| `EquipPanel.tsx` | Status, bag, job + stance label |
| `App.tsx` | Keys 1–0, Q potion, B status, K spellbook, Esc |
| `state.ts` / `net.ts` | Zustand + `npc/dialog` |

### Flux / Quicken / Level-up VFX

- Flux: silhouette + fringe aura.  
- Quicken family: dual orb belts, trails, occlusion, cast burst (any haste that sets `quickenUntil`).  
- Level-up: rising rings + sparks.

## Server (`apps/server`)

- `index.ts` — tick, Player.job, full buff fields, NPC, job/change.  
- `tim-abilities.ts` — data-driven TIM kit.  
- Snapshots include `you.job`, `you.unlocked`, full `BuffState`.

## Tunings (feel-first)

| Knob | Value |
|------|-------|
| Base swing | 1600 ms |
| Quicken haste | 0.35 |
| Flux move | ×1.12 |
| Rest | +8 HP, +6 MP, −40 TP / s |
| XP to L2 | 100 |

## Explicit non-goals (still)

- Other jobs playable kits (design locked in `jobs-from-plan.md`; implement per job-creation skill)  
- Real chain burn (potion mock)  
- Postgres / multiplayer persistence  
- Female TIM / full 8-dir strips  
- Per-ability unique VFX for every enfeeble  

When building another job: follow `SKILL.md` + that job’s section in `jobs-from-plan.md`. Reuse TIM only for **package/server/HUD patterns**, never as a reskin.

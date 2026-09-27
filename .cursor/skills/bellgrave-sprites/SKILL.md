---
name: bellgrave-sprites
description: >-
  Generate and wire Bellgrave job/mob sprites (8-dir, chroma key, billboards).
  Use when creating sprites for Time Mage, Knight, Rogue, Cleric, Sorcerer,
  Fighter, Battle Mage, or enemies; when baking magenta backgrounds; or when
  extending facing.ts / WorldScene sprite URLs.
---

# Bellgrave sprites

Original isometric MMO sprites for Bellgrave. Do **not** use trademarked game names in prompts, file comments, or UI copy.

For full job creation (unique kits, spells, VFX, server, HUD — not TIM reskins), use `.cursor/skills/bellgrave-job-creation/SKILL.md` and `jobs-from-plan.md`. TIM wiring notes: `reference-time-mage.md`.

## Locked look

| Rule | Spec |
|------|------|
| Perspective | 3/4 isometric (not side-scroller) |
| Proportion | ~3–4 heads tall; readable silhouette at game scale |
| Outline | Soft dark colored outlines (not harsh pure black) |
| Shading | Soft 2–3 value steps; cloth/armor readable |
| Background | Solid flat **#FF00FF** magenta only — no checkerboard, gradients, or shadows on BG |
| Aspect | Single full-body frames: **3:4** |
| World | Y-billboards in R3F; pale stone hall behind |

**Master seed:** `bellgrave-93471`  
**Per-job seed (same for every view + anim of that job):**

| Job | Seed |
|-----|------|
| Knight | `bellgrave-93471-knight` |
| Rogue | `bellgrave-93471-rogue` |
| Cleric | `bellgrave-93471-cleric` |
| Sorcerer | `bellgrave-93471-sorcerer` |
| Fighter | `bellgrave-93471-fighter` |
| Battle Mage | `bellgrave-93471-battlemage` |
| Time Mage | `bellgrave-93471-timemage` |

Never change seed when rotating facing — only the view cue changes.

## View set (8-dir)

Art files for **n / ne / e / se / s**. Runtime mirrors **ne→nw, e→w, se→sw**.

| View | DirKey | Prompt cue |
|------|--------|------------|
| Front | `s` | Facing camera |
| Front 3⁄4 | `se` (+ mirror `sw`) | Primary gameplay |
| Side | `e` (+ mirror `w`) | Profile |
| Back 3⁄4 | `ne` (+ mirror `nw`) | Over-shoulder |
| Back | `n` | Away from camera |

Approve **SE** first as canonical, then fan out (same outfit/palette/weapon).

## Anim set (MVP → V1)

| Anim | MVP | Notes |
|------|-----|-------|
| `idle` | 5 authored dirs | Required |
| `walk` | 5 authored dirs | Required |
| `melee` | SE only OK | Mirror via facing |
| `cast` | SE only OK | Mirror via facing |
| `rest` | SE only | Kneel / meditate; TIM ships this |
| `dead` | optional | Reuse idle or dedicated |

Later: run, hit, death strips; multi-frame sheets (idle 4–8, walk 6–8, melee 4–6, cast 8–16).

## Job style cards (prompt anchors)

Shared palette language: Bellgrave dead-city — dust, ash gold, muted jewels, **no neon**.

- **Knight** — heavy plate, shield + sword; steel/charcoal/crimson; modest cape
- **Rogue** — light armor, daggers; deep purple/brown/black; hood/scarf/pouches
- **Cleric** — vestments, mace/staff; white/sky blue/soft gold; bell or broken-sun mark
- **Sorcerer** — caster robes, staff orb; violet/deep blue/wine; rune hems
- **Fighter** — two-hander DPS; iron grey/oxblood/leather; no oversized ceremonial cape
- **Battle Mage** — hybrid gauntlets + tunic/half-robe + sword; teal/steel/bronze
- **Time Mage** — staff battlemage, robe cut for melee; dust gold / pale ash / deep teal / clock-bronze; hourglass + **orbital-ring staff**

**Avoid:** modern clothes, guns, sci-fi neon, realistic 1:1 anatomy, 2-head chibi, muddy silhouettes.

## File naming + paths

Put files in `apps/web/public/sprites/`.

```
{job}-{anim}-{dir}.png     # e.g. knight-idle-se.png, rogue-walk-n.png
{job}-{anim}-vN.png        # single-facing anims: tim-melee-v3.png, tim-rest-v1.png
{mob}-{anim}-vN.png        # e.g. guard-idle-v2.png
```

Job slug examples: `tim`, `knight`, `rogue`, `cleric`, `sorc`, `fighter`, `bmage`.

## Generate prompt template

```
Single full-body game character sprite, isometric RPG {JOB}, {facing} view,
{gender} adult. Soft cel outline, readable, not chibi. {PALETTE + MOTIFS}.
{POSE / ANIM}. SOLID flat magenta background color #FF00FF only, no gradients,
no checkerboard, no shadows on background, no text, no UI. Character fully opaque.
Classic isometric MMO sprite look. Seed mood: {job seed}.
```

Use `GenerateImage` with `aspect_ratio: "3:4"`. For cohesion across dirs, pass the approved SE PNG as `reference_image_paths` when available.

## Ability icons (HUD)

Square **1:1** fantasy icons for hotbar / spellbook — same chroma pipeline as sprites.

| Rule | Spec |
|------|------|
| Path | `apps/web/public/icons/abilities/{abilityId}.png` **or** shared spell file (see below) |
| Aspect | **1:1** (`GenerateImage` `aspect_ratio: "1:1"`) |
| Background | Solid flat **#FF00FF** magenta only |
| Subject | Single centered motif (object / rune / effect), readable at ~40–64px |
| Style | Soft cel outline, 2–3 value steps, job seed palette — **no text, no UI frame, no letter tiles** |
| Seed | Same job seed as character art (e.g. `bellgrave-93471-timemage`) |
| Bake | Magenta → alpha; resize to **128×128** |

### Shared spells — do NOT regenerate

**Never** `GenerateImage` for a spell concept that already has art. One Cure icon serves every job.

Canonical shared files (reuse via `SHARED_ABILITY_ICON` in `packages/combat/src/shared-icons.ts`):

`cure`, `cure_ii`–`cure_iv`, `protect`/`_ii`/`_iii`, `shell`/`_ii`/`_iii`, `banish`/`_ii`, `holy`, `flash`, `haste`, `hastega`, `slow`, `rest`, …

When a new job needs Cure/Protect/etc.:

1. Add ability id (may be job-prefixed, e.g. `cl_cure`)  
2. Map it in `SHARED_ABILITY_ICON` → `/icons/abilities/cure.png`  
3. **Skip** GenerateImage  

Only generate icons for **job-unique** abilities (JAs, unique spells).

### Ability icon prompt template

```
Fantasy RPG ability icon, square 1:1 composition. {JOB} ability "{NAME}": {MOTIF}.
Centered iconic object only, soft cel-shaded, readable at tiny HUD size,
{PALETTE}. Soft dark outline. SOLID flat magenta background color #FF00FF only,
no gradients, no checkerboard, no shadows on background, no text, no UI chrome, no frame.
Classic isometric MMO spell icon. Seed mood: {job seed}.
```

Every ability id must resolve to a PNG (shared or unique) before the job is “done.”

## Bake transparency

Magenta/hot-pink must become alpha (runtime `applyMagentaChroma` is backup; **bake into PNGs**):

```python
from PIL import Image
import os

dir = r"apps/web/public/sprites"
for f in os.listdir(dir):
    if not f.endswith(".png"): continue
    p = os.path.join(dir, f)
    im = Image.open(p).convert("RGBA")
    px = im.load()
    w, h = im.size
    keyed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            # classic #FF00FF + hot pink (~246,6,141) + near-fuchsia
            if r > 200 and g < 50 and b > 80 and (r - g) > 140:
                px[x, y] = (r, g, b, 0); keyed += 1
            elif r > 160 and b > 160 and g < 140 and (r - g) > 35 and (b - g) > 35:
                px[x, y] = (r, g, b, 0); keyed += 1
            elif r > 200 and b > 170 and g < 170 and (r - g) > 30:
                px[x, y] = (r, g, b, 0); keyed += 1
    if keyed > 50:
        im.save(p, optimize=True)
        print(f"{f}: keyed {keyed}")
```

Also knock out accidental near-black plates if the generator used black BG instead of magenta.

## Wire into client

1. Add URLs to `TIM_SPRITE_URLS` / job URL list in `apps/web/src/facing.ts` (or job-specific helper).
2. Map anim → URL in `timSpriteUrl` / `guardSpriteUrl` (melee/cast/rest may be single SE file).
3. `WorldScene` preloads via `useTexture(urls)` + `applyMagentaChroma`.
4. Facing: `facingPick(worldFacing, toCameraYaw, prev)` — always pass `prev` for hysteresis.
5. HP/MP bars sit under the sprite on the **billboard** group (camera-facing), not Html.

## Pipeline order (mandatory)

1. Style card text for the job (palette + motifs + avoids).
2. Generate + approve **SE idle** (canonical).
3. Generate remaining idle dirs (same seed; reference SE when possible).
4. Walk dirs → melee/cast/rest as needed.
5. Bake chroma → drop into `public/sprites` → wire facing URLs → hard-refresh.

## Checklist for a new job

- [ ] Style card + seed locked
- [ ] SE idle approved
- [ ] Idle + walk for n/ne/e/se/s
- [ ] Melee (+ cast if caster) SE
- [ ] Chroma baked; edges clean (no pink halo)
- [ ] URL helper + preload list updated
- [ ] In-world: idle/walk facing stable (no flicker at octant edges)
- [ ] Bars under sprite; silhouette reads on pale stone

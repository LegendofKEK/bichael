# Pale Hollow — First Area Design

**Region level band:** 1–20 (catalyst: Pale Dust) · **Hub:** The Shard Dwellings  
**Structure:** Soft-gated **northbound segments** inside a **wide open basin** (Reisenjima-style room to roam east/west). Soft level advice + bridges remain; hard canyon walls do not.

**Playable bounds:** roughly ±88 east–west, −24…268 south–north. Mountain peaks ring the fringe; meadows/grass fill the flanks; chalk run + east tributary use a soft-edged flow ribbon (`PaleHollowRivers`, Water2-style dual normals) over wet riverbed terrain.

**Sources:** item manifest, Kek Items Onchain plan, `packages/config/src/pale-hollow.ts`, ambientCG CC0 albedos under `apps/web/public/textures/pale-hollow/`.

**Related OSS (design / water):** LDtk + Tiled (level layout), Godot / Bevy (full engines — reference, not this stack), three.js `Water`/`Water2` + Valve flow-map paper, `@react-three/drei` (`useDepthBuffer`, `MeshReflectorMaterial`). Runtime stack stays R3F + Three.

Onchain: field gather/drop = **base mats → Character NFT**. Craft in the Dwellings burns **1000 KEK** + mats.

---

## Design rule

| Wrong | Right |
|-------|--------|
| Narrow corridor you never leave the road | **Open basin** — roam flanks; soft gates tip recommended level |
| Soft “recommended level” only with no landmarks | Soft advice **plus** bridges / cuts / tunnel as landmarks (still crossable) |

Content focus stays northbound by segment, but the heightfield and biomes fill the whole rectangle so the world feels open.

---

## Corridor overview (content focus)

```
S  THE SHARD DWELLINGS (safe hub — always)
        │  terrace gate
        ▼
┌─────────────────────────┐
│  SEGMENT A · Lv 1–5     │  Dustgrain Terraces + Chalk Run + meadows
│  “Hollow Steps”         │  wide farm/meadow flanks
└───────────┬─────────────┘
            │  Timber Bridge (quest / Lv5 soft gate)
            ▼
┌─────────────────────────┐
│  SEGMENT B · Lv 5–10    │  Ashbeam groves in open grassland
│  “Ashbeam Reach”        │  multiple groves, not a tree tunnel
└───────────┬─────────────┘
            │  Quarry Cut bridge / winch lift (Lv10)
            ▼
┌─────────────────────────┐
│  SEGMENT C · Lv 10–15   │  Hollow Quarry landmark + grass marches
│  “Chalkworks”           │  vine cliffs on far east/west
└───────────┬─────────────┘
            │  Seam Tunnel (Lv15)
            ▼
┌─────────────────────────┐
│  SEGMENT D · Lv 15–20   │  Copper Seams + Shard Crypt + Ash Road
│  “Pale Marches”         │  grass/scrub marches to blocked Ash Road
└───────────┬─────────────┘
            │
            ▼
N  Ashlands / Obsidia (Lv21+)
```

**Return path:** soft bridges stay crossable so players can retreat to the Dwellings to craft (KEK burn).

---

## Segment A — Hollow Steps (Lv 1–5)

**Theme:** Quiet chalk terraces and open meadow flanks. Learn gather, optional combat, first craft.

| | |
|--|--|
| **Size** | Wide band ~±70 × z 10–58 — farm strip + meadows + river |
| **Mobs** | Dust Hare (safe/flee), Pale Slime (proximity, river / tributary) |
| **Nodes** | dustgrain, pale-dust blooms, potters-clay, fossil-minnow, starter copper nugget |
| **Structures** | Dustgrain silos, clay bank, fishing pools |
| **Aggro feel** | Almost peaceful. Hares don’t fight first. Slimes only if you wade in. |

**Bridge out — Timber Bridge:** Herald quest “Cross the ashbeam span” after gather tutorial + first Bronze Ingot craft (1000 KEK). Soft check Lv5; underleveled can still cross with warning.

---

## Segment B — Ashbeam Reach (Lv 5–10)

**Theme:** Scattered ashbeam groves in open grassland; scrub only at the far rim.

| | |
|--|--|
| **Size** | ~80×55 |
| **Mobs** | Hollow Scavenger (sight + link), Ashbeam Boar (sound), Hares on edges |
| **Nodes** | ashbeam-log, bark-strip, dead-fiber, antidote-root (sparse), pale-dust |
| **Structures** | Shrine stump checkpoint, scavenger camp, boar wallow |
| **Aggro feel** | Walk calm past boars; scavenger camps face the road. Side paths safer. |

**Bridge out — Quarry Cut:** winch lift / stone arch. Opens at Herald beat + Lv10 soft gate. Visual: you look down into the Chalkworks for the first time.

---

## Segment C — Chalkworks (Lv 10–15)

**Theme:** Working quarry and vine walls. Sight-cone pulls, vertical gather.

| | |
|--|--|
| **Size** | ~85×60 |
| **Mobs** | Ruin Dweller (sight), Cliff Adder (proximity ambush), Scavenger lookouts |
| **Nodes** | cobble, limestone (mine), climbing-cord (cliffs), pale-dust |
| **Structures** | Broken crane landmark, quarry shelves, vine cliff face |
| **Aggro feel** | Dwellers watch lanes; adders punish hugging walls. No sound-boars here. |

**Bridge out — Seam Tunnel:** torchlit cut into the north cliff. Lv15 soft gate + “reinforce the terrace” limestone turn-in.

---

## Segment D — Pale Marches (Lv 15–20)

**Theme:** Ore dark, crypt mouth, road to Ashlands.

| | |
|--|--|
| **Size** | ~90×65 |
| **Mobs** | Seam Golem (sight, slow), Shard Wight (sight + link), Ruin Dweller at crypt fringe |
| **Nodes** | copper-ore + tin-ore veins, rare pale-dust crystals |
| **Structures** | Seam lanterns, crypt gate arch, Ash Road cairn |
| **Aggro feel** | Careful pulls. Crypt is the first “don’t link the room” space. |

**Exit — Ash Road:** travel to Obsidia when Lv18+ and Herald chapter complete (or Lv20 hard recommend).

---

## Why this isn’t “one giant zone”

| Segment | Playable footprint | Content focus | Time-to-clear (rough) |
|---------|-------------------|---------------|------------------------|
| A 1–5 | Small | Tutorial gather/craft | 30–60 min |
| B 5–10 | Medium | Combat literacy | 1–2 hrs |
| C 10–15 | Medium | Mining + vertical | 1–2 hrs |
| D 15–20 | Medium | Ore + mini-dungeon | 1–2 hrs |

Hub is shared. Streaming: load **hub + current segment + previous segment** (for retreat); unload the far band. Greybox can ship **A alone**, then bolt B/C/D.

---

## Aggro (unchanged principle, per segment)

| Mode | Who |
|------|-----|
| **Safe** | Hub; Dust Hares |
| **Sight** | Scavengers, Dwellers, Golems, Wights |
| **Sound** | Boars (segment B) — sprint/combat ping |
| **Proximity** | Slimes, Cliff Adders |
| **Link** | Scavenger pairs; Dweller pairs; Wight packs |

Hub suppresses combat AI sound.

---

## Gathering ↔ segment (manifest)

| Mat | Segment |
|-----|---------|
| dustgrain, pale-dust (common), clay, fossil-minnow, starter copper | **A** |
| ashbeam-log, bark-strip, dead-fiber, antidote-root | **B** |
| cobble, limestone, climbing-cord | **C** |
| copper-ore, tin-ore (full veins), pale-dust crystals | **D** |
| Combat drops (linen-scrap, hides, cracked-brick, bone-chip, slime-oil, …) | Follow mob segment |

---

## Quest spine (bridges are story beats)

1. **A:** Gather + first craft (Bronze Ingot, 1000 KEK) → open Timber Bridge.  
2. **B:** Linen Scrap / scavenger clear → open Quarry Cut.  
3. **C:** Limestone for terrace → open Seam Tunnel.  
4. **D:** Bone Chip from crypt → open Ash Road.

---

## City — The Shard Dwellings

Always reachable from every unlocked segment (south). NPCs: Elder, Herald, Job Master, Trainer, Craft Master, Provisioner. Safe zone.

---

## Implementation order

1. Greybox **hub + Segment A** only (shippable vertical slice).  
2. Timber Bridge + Segment B.  
3. Quarry Cut + Segment C.  
4. Seam Tunnel + Segment D + Ash Road.  
5. Art / streaming polish.

---

## Locked / open

**Locked by this revision:** Pale Hollow = corridor of four ~5-level segments with bridges — not one open 1–20 field.

**Still open:**
1. Fishing: free weak bites in A vs bait-gated.  
2. Crypt: instance vs seamless pocket in D.  
3. Cliff fall damage in C.  
4. Hares forever Safe vs later frenzy.

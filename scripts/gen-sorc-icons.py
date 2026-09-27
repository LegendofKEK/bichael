"""Generate Sorcerer ability icons (128x128, magenta BG) and bake chroma."""
from __future__ import annotations

import math
import os
import shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "apps", "web", "public", "icons", "abilities")
SPRITE_ASSETS = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "c-Users-raxac-OneDrive-Desktop-apps-time-mage-LSB",
    "assets",
)
SPRITE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites")

MAGENTA = (255, 0, 255, 255)

ELEMENT_RGB = {
    "fire": (230, 90, 40),
    "stone": (140, 110, 75),
    "water": (55, 130, 210),
    "wind": (120, 200, 160),
    "ice": (170, 220, 255),
    "lightning": (240, 220, 80),
    "dark": (90, 40, 120),
    "ja": (120, 80, 200),
    "enfeeble": (150, 100, 180),
    "travel": (100, 90, 160),
}


def chroma_key(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 200 and g < 50 and b > 80 and (r - g) > 140:
                px[x, y] = (r, g, b, 0)
            elif r > 160 and b > 160 and g < 140 and (r - g) > 35 and (b - g) > 35:
                px[x, y] = (r, g, b, 0)
            elif r > 200 and b > 170 and g < 170 and (r - g) > 30:
                px[x, y] = (r, g, b, 0)
    return im


def icon_for(id: str, label: str, kind: str, tier: int = 1) -> None:
    out = os.path.join(ICON_DIR, f"{id}.png")
    if id in ("sc_root_sigil", "sc_unweave", "rest"):
        return
    rgb = ELEMENT_RGB.get(kind, ELEMENT_RGB["ja"])
    scale = 0.85 + min(tier, 4) * 0.04
    im = Image.new("RGBA", (128, 128), MAGENTA)
    d = ImageDraw.Draw(im)
    cx, cy = 64, 64
    r = int(34 * scale)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgb + (255,), outline=(40, 30, 60, 255), width=3)
    if kind == "fire":
        d.polygon([(cx, cy - r - 6), (cx - 14, cy + 8), (cx + 14, cy + 8)], fill=(255, 160, 60, 255))
    elif kind == "stone":
        d.rectangle((cx - 18, cy - 10, cx + 18, cy + 16), fill=(100, 80, 60, 255))
    elif kind == "water":
        for i in range(3):
            d.arc((cx - 26 + i * 4, cy - 8, cx + 26 - i * 4, cy + 28), 200, 340, fill=(80, 160, 230, 255), width=3)
    elif kind == "wind":
        d.line([(cx - 28, cy), (cx + 28, cy - 8)], fill=(200, 255, 220, 255), width=4)
        d.line([(cx - 24, cy + 12), (cx + 24, cy + 4)], fill=(180, 240, 200, 255), width=3)
    elif kind == "ice":
        d.polygon([(cx, cy - r), (cx + 12, cy), (cx, cy + r), (cx - 12, cy)], fill=(220, 245, 255, 255))
    elif kind == "lightning":
        d.polygon([(cx + 4, cy - r), (cx - 8, cy + 4), (cx + 6, cy + 4), (cx - 4, cy + r)], fill=(255, 240, 120, 255))
    elif kind == "ja" and id == "arcane_flood":
        d.ellipse((cx - 40, cy - 40, cx + 40, cy + 40), outline=(180, 140, 255, 255), width=4)
    im = chroma_key(im)
    im = im.resize((128, 128), Image.Resampling.LANCZOS)
    im.save(out, optimize=True)


# Tier from suffix
def tier_of(id: str) -> int:
    if id.endswith("_iv") or id.endswith("_nova") or id.endswith("_cataclysm") or id.endswith("_maelstrom"):
        return 4
    if "_iii" in id or id.endswith("_3"):
        return 3
    if "_ii" in id or id.endswith("_2"):
        return 2
    return 1


def element_of(id: str) -> str:
    if id.startswith("sc_ember") or "ember" in id:
        return "fire"
    if id.startswith("sc_gravel"):
        return "stone"
    if id.startswith("sc_tide"):
        return "water"
    if id.startswith("sc_gale"):
        return "wind"
    if id.startswith("sc_rime"):
        return "ice"
    if id.startswith("sc_volt"):
        return "lightning"
    if id in ("sc_life_leech", "sc_mana_siphon", "sc_gloom_stun"):
        return "dark"
    if id.startswith("sc_morrow") or id == "sc_mist_blind":
        return "enfeeble"
    if id.startswith("sc_phase") or id.startswith("sc_ash"):
        return "travel"
    if id.startswith("arcane") or id in (
        "elemental_seal",
        "mana_wall",
        "manawell",
        "enmity_douse",
        "cascade",
        "focal_neve",
    ):
        return "ja"
    return "ja"


IDS = open(
    os.path.join(ROOT, "packages", "combat", "src", "sorcerer-kit.ts"), encoding="utf-8"
).read()
import re

ability_ids = re.findall(r'"((?:sc_|arcane_|elemental_|mana_|manawell|enmity_|cascade|focal_)[^"]+)"', IDS)
ability_ids = list(dict.fromkeys(ability_ids))

for aid in ability_ids:
    icon_for(aid, aid, element_of(aid), tier_of(aid))

# Copy + bake sprites
for name in os.listdir(SPRITE_ASSETS):
    if name.startswith("sorc-") and name.endswith(".png"):
        src = os.path.join(SPRITE_ASSETS, name)
        dst = os.path.join(SPRITE_DIR, name)
        shutil.copy2(src, dst)
        chroma_key(Image.open(dst)).save(dst, optimize=True)
        print("sprite", name)

print("icons", len(ability_ids))

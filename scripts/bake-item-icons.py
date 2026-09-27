"""Resize + chroma-bake ONLY catalog item icons into public/icons/items."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "packages" / "items" / "src" / "catalog.json"
CURSOR_ASSETS = Path(
    r"C:\Users\raxac\.cursor\projects\c-Users-raxac-OneDrive-Desktop-apps-time-mage-LSB\assets"
)
OUT = ROOT / "apps" / "web" / "public" / "icons" / "items"
MASTERS = ROOT / "assets" / "icons" / "items"
SIZE = 96


def bake(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    a = np.array(im)
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    # #FF00FF + hot-pink generator variants + near-black plates
    m1 = (r > 200) & (g < 50) & (b > 80) & ((r - g) > 140)
    m2 = (r > 160) & (b > 160) & (g < 140) & ((r - g) > 35) & ((b - g) > 35)
    m3 = (r > 200) & (b > 170) & (g < 170) & ((r - g) > 30)
    m4 = (r > 180) & (g < 80) & (b > 80) & ((r - g) > 100) & (b < 200)
    m5 = (r < 18) & (g < 18) & (b < 18)
    a[m1 | m2 | m3 | m4 | m5, 3] = 0
    return Image.fromarray(a)


def main() -> None:
    slugs = {i["slug"] + ".png" for i in json.loads(CATALOG.read_text(encoding="utf-8"))}
    OUT.mkdir(parents=True, exist_ok=True)
    MASTERS.mkdir(parents=True, exist_ok=True)

    sources: list[Path] = []
    if CURSOR_ASSETS.is_dir():
        sources.extend(CURSOR_ASSETS.glob("*.png"))
    sources.extend(MASTERS.glob("*.png"))

    seen: set[str] = set()
    for p in sources:
        if p.name not in slugs or p.name in seen:
            continue
        seen.add(p.name)
        if p.parent.resolve() != MASTERS.resolve():
            shutil.copy2(p, MASTERS / p.name)
        bake(Image.open(p)).save(OUT / p.name, optimize=True)
        print("baked", p.name)

    print(f"done {len(seen)} / {len(slugs)} catalog icons")


if __name__ == "__main__":
    main()

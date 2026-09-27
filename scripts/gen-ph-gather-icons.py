"""Generate distinctive Pale Hollow gather-item icons (not powder piles)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "icons" / "items"
SIZE = 96
MAGENTA = (255, 0, 255, 255)


def new_canvas():
    im = Image.new("RGBA", (SIZE, SIZE), MAGENTA)
    return im, ImageDraw.Draw(im)


def save(im: Image.Image, name: str) -> None:
    px = im.load()
    assert px is not None
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, _a = px[x, y]
            if r > 240 and g < 20 and b > 240:
                px[x, y] = (0, 0, 0, 0)
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / name, optimize=True)
    print("wrote", name)


def main() -> None:
    # dustgrain — wheat / grain sheaf
    im, d = new_canvas()
    for i, x in enumerate([38, 48, 58, 43, 53]):
        d.line([(x, 78), (x + (i - 2) * 2, 28)], fill=(120, 90, 40, 255), width=3)
    for x, y in [(36, 24), (46, 20), (56, 24), (42, 30), (52, 28)]:
        d.ellipse([x - 6, y - 10, x + 6, y + 4], fill=(210, 175, 70, 255), outline=(160, 120, 40, 255))
        for dy in range(-8, 4, 3):
            d.line([(x - 4, y + dy), (x + 4, y + dy)], fill=(180, 140, 50, 255), width=1)
    save(im, "dustgrain.png")

    # potters-clay — clay lump
    im, d = new_canvas()
    d.ellipse([22, 34, 78, 78], fill=(180, 110, 75, 255), outline=(120, 70, 45, 255))
    d.ellipse([30, 28, 70, 58], fill=(200, 130, 90, 255))
    d.arc([28, 40, 72, 70], 200, 340, fill=(140, 85, 55, 255), width=2)
    save(im, "potters-clay.png")

    # clay-crab
    im, d = new_canvas()
    d.ellipse([32, 40, 64, 68], fill=(200, 70, 55, 255), outline=(140, 40, 35, 255))
    for ang in (-40, -20, 20, 40):
        rad = math.radians(ang)
        x0, y0 = 48 + math.cos(rad) * 10, 54 + math.sin(rad) * 6
        x1, y1 = 48 + math.cos(rad) * 28, 54 + math.sin(rad) * 22
        d.line([(x0, y0), (x1, y1)], fill=(180, 60, 50, 255), width=3)
    d.ellipse([36, 34, 46, 44], fill=(220, 90, 70, 255))
    d.ellipse([50, 34, 60, 44], fill=(220, 90, 70, 255))
    d.ellipse([38, 36, 42, 40], fill=(20, 20, 20, 255))
    d.ellipse([54, 36, 58, 40], fill=(20, 20, 20, 255))
    save(im, "clay-crab.png")

    # fossil-minnow — fish
    im, d = new_canvas()
    d.ellipse([22, 38, 72, 62], fill=(150, 170, 160, 255), outline=(90, 110, 100, 255))
    d.polygon([(72, 50), (88, 40), (88, 60)], fill=(130, 150, 140, 255))
    d.ellipse([30, 44, 38, 52], fill=(30, 40, 50, 255))
    d.line([(40, 50), (65, 50)], fill=(100, 120, 110, 255), width=1)
    save(im, "fossil-minnow.png")

    # cobble — stacked stones
    im, d = new_canvas()
    d.ellipse([18, 50, 50, 78], fill=(130, 125, 115, 255), outline=(80, 75, 70, 255))
    d.ellipse([40, 48, 78, 76], fill=(150, 145, 135, 255), outline=(90, 85, 80, 255))
    d.ellipse([28, 30, 62, 58], fill=(160, 155, 145, 255), outline=(100, 95, 90, 255))
    save(im, "cobble.png")

    # limestone — pale slab
    im, d = new_canvas()
    d.polygon([(20, 70), (30, 28), (70, 24), (82, 68), (50, 80)], fill=(220, 215, 195, 255), outline=(160, 155, 140, 255))
    d.line([(32, 40), (68, 36)], fill=(180, 175, 160, 255), width=2)
    d.line([(28, 55), (74, 52)], fill=(190, 185, 170, 255), width=2)
    save(im, "limestone.png")

    # dead-fiber — twine bundle
    im, d = new_canvas()
    for i in range(7):
        x = 30 + i * 6
        d.line([(x, 22), (x - 4, 78)], fill=(140, 120, 90, 255), width=4)
    d.ellipse([28, 40, 70, 58], fill=(110, 90, 60, 255), outline=(80, 65, 45, 255))
    save(im, "dead-fiber.png")

    # antidote-root
    im, d = new_canvas()
    d.line([(48, 20), (48, 50)], fill=(160, 120, 70, 255), width=6)
    d.line([(48, 50), (28, 78)], fill=(150, 110, 65, 255), width=5)
    d.line([(48, 50), (68, 76)], fill=(150, 110, 65, 255), width=5)
    d.line([(48, 40), (34, 58)], fill=(145, 105, 60, 255), width=3)
    d.ellipse([42, 16, 54, 28], fill=(90, 140, 70, 255))
    save(im, "antidote-root.png")

    # climbing-cord — coiled rope
    im, d = new_canvas()
    for r in (28, 20, 12):
        d.ellipse([48 - r, 48 - r, 48 + r, 48 + r], outline=(180, 150, 90, 255), width=5)
    d.arc([20, 20, 76, 76], 0, 300, fill=(200, 170, 100, 255), width=6)
    save(im, "climbing-cord.png")

    # tin-ore — silvery chunk
    im, d = new_canvas()
    d.polygon([(28, 70), (22, 40), (48, 22), (74, 38), (78, 68), (50, 82)], fill=(190, 195, 200, 255), outline=(110, 115, 120, 255))
    d.polygon([(40, 50), (48, 30), (62, 42)], fill=(230, 235, 240, 255))
    save(im, "tin-ore.png")

    # bark-strip
    im, d = new_canvas()
    d.polygon([(30, 20), (58, 18), (70, 78), (38, 80)], fill=(120, 75, 45, 255), outline=(80, 50, 30, 255))
    d.arc([34, 25, 66, 75], 90, 270, fill=(90, 55, 35, 255), width=4)
    d.line([(40, 35), (55, 33)], fill=(160, 110, 70, 255), width=2)
    save(im, "bark-strip.png")

    # pale-dust — crystal facet (not a powder pile)
    im, d = new_canvas()
    d.polygon([(48, 14), (72, 40), (60, 78), (36, 78), (24, 40)], fill=(210, 230, 240, 255), outline=(140, 170, 190, 255))
    d.polygon([(48, 14), (60, 40), (48, 50), (36, 40)], fill=(240, 250, 255, 255))
    d.line([(48, 50), (48, 78)], fill=(160, 190, 210, 255), width=2)
    save(im, "pale-dust.png")

    print("done")


if __name__ == "__main__":
    main()

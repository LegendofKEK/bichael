"""Strip dirt-mound bases from prop sprites — same treatment as trees.

Hard-kills dirt/soil plate pixels in the base band, then keeps a soft
plant/rock contact flare into the terrain.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "sprites" / "props"

VEG = [
    "ph-long-grass.png",
    "ph-long-grass-b.png",
    "ph-tall-grass-patch.png",
    "ph-tall-grass-patch-b.png",
    "ph-grass-tuft.png",
    "ph-grass-low.png",
    "ph-leafy-fern.png",
    "ph-leafy-fern-b.png",
    "ph-scrub-bush.png",
    "ph-scrub-bush-b.png",
    "ph-dry-scrub.png",
    "ph-dry-scrub-b.png",
    "ph-dustgrain-stalk.png",
    "ph-river-reed.png",
    "ph-pale-bloom.png",
    "ph-ashbeam-sapling.png",
    "ph-ashbeam-tree-med.png",
    "ph-ashbeam-tree-tall.png",
]

ROCKS = [
    "ph-pale-rock.png",
    "ph-pale-rock-b.png",
]


def chroma_key(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    m = (
        ((r > 200) & (g < 50) & (b > 80) & ((r - g) > 140))
        | ((r > 160) & (b > 160) & (g < 140) & ((r - g) > 35) & ((b - g) > 35))
        | ((r > 200) & (b > 170) & (g < 170) & ((r - g) > 30))
        | ((r > 180) & (g < 80) & (b > 80) & ((r - g) > 100) & (b < 200))
        | ((r < 14) & (g < 14) & (b < 14))
    )
    a = a.copy()
    a[m, 3] = 0
    return a


def autocrop(arr: np.ndarray, pad: int = 0) -> np.ndarray:
    ys, xs = np.where(arr[:, :, 3] > 12)
    if len(xs) == 0:
        return arr
    return arr[
        max(0, ys.min() - pad) : ys.max() + pad + 1,
        max(0, xs.min() - pad) : xs.max() + pad + 1,
    ]


def dirt_mask(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Soil plate: warm brown/tan OR dark charcoal pads (not green foliage / pale rock)."""
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    opaque = alpha > 12
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    warm = (r > 50) & (g > 30) & (b < r * 0.97) & (g <= r * 1.15) & ((r + g) * 0.5 > b + 10)
    not_green = g < r * 1.22 + 10
    not_cool_grey = (np.abs(r - g) > 5) | ((r - b) > 12)
    dark_soil = (lum < 75) & (g <= r + 10) & (b <= r + 12) & (r < 120) & (g < 100)
    # Explicit green foliage exemption
    green_leaf = (g > r + 6) & (g > b + 4) & (g > 55)
    return opaque & ~green_leaf & ((warm & not_green & not_cool_grey) | dark_soil)


def plant_pixels(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Foliage / stem — not soil plate."""
    return (alpha > 12) & ~dirt_mask(rgb, alpha)


def body_span_from_mask(mask: np.ndarray, y_a: int, y_b: int, w: int) -> tuple[int, int]:
    best_w = 10**9
    cx = w // 2
    half = max(2, w // 14)
    for y in range(y_a, max(y_a + 1, y_b)):
        xs = np.where(mask[y])[0]
        if len(xs) < 1:
            continue
        spans: list[tuple[int, int]] = []
        s = xs[0]
        p = xs[0]
        for x in xs[1:]:
            if x == p + 1:
                p = x
            else:
                spans.append((s, p))
                s = p = x
        spans.append((s, p))
        s0, s1 = max(spans, key=lambda t: t[1] - t[0])
        ww = s1 - s0 + 1
        if ww < best_w:
            best_w = ww
            cx = (s0 + s1) // 2
            half = max(2, int(ww * 0.55))
    return cx, half


def strip_base(arr: np.ndarray, *, rock: bool = False) -> np.ndarray:
    """Tree-style wipe: erase soil plate; soft plant/rock contact only."""
    h, w = arr.shape[:2]
    a = arr.astype(np.float32)
    rgb = a[:, :, :3]
    alpha = a[:, :, 3]
    opaque = alpha > 12
    ys = np.where(opaque.any(axis=1))[0]
    if len(ys) == 0:
        return arr
    y_top, y_bot = int(ys[0]), int(ys[-1])
    th = max(1, y_bot - y_top)

    dirt = dirt_mask(rgb, alpha)
    plant = plant_pixels(rgb, alpha)

    # Span from plant body just above the plate (ignore dirt when measuring)
    y_a = y_top + int(th * (0.50 if rock else 0.48))
    y_b = y_top + int(th * (0.78 if rock else 0.72))
    cx, half = body_span_from_mask(plant if plant[y_a:y_b].any() else opaque, y_a, y_b, w)

    # For thin stalks, half can be tiny; for bushes allow a bit more contact width
    if not rock and half > w * 0.35:
        half = max(3, int(w * 0.18))

    base_h = max(12, int(th * (0.34 if th < 130 else 0.26)))
    if rock:
        base_h = max(10, int(th * 0.28))
    y0 = max(y_top, y_bot - base_h)

    stump_keep = 0.28 if rock else 0.32

    for y in range(y0, y_bot + 1):
        t = (y - y0) / max(1.0, base_h)
        # Contact corridor tapers toward ground
        half_y = half * (1.05 - 0.55 * t)
        if rock:
            half_y = half * (1.08 - 0.2 * t)

        for x in range(w):
            if alpha[y, x] < 8:
                continue

            # 1) Always erase soil plate in the base band
            if dirt[y, x]:
                alpha[y, x] = 0
                continue

            d = abs(x - cx)
            # 2) Outside contact flare — erase (mound wings / fringe)
            if d > half_y:
                alpha[y, x] = 0
                continue

            # 3) Soft plant/rock fade into terrain
            edge = max(0.0, 1.0 - (d / max(half_y, 0.01)) ** 2.1)
            if t <= stump_keep:
                alpha[y, x] *= 0.82 + 0.18 * edge
            else:
                u = (t - stump_keep) / max(1e-6, 1.0 - stump_keep)
                alpha[y, x] *= edge * (1.0 - u) ** 1.45

    a[:, :, 3] = np.clip(alpha, 0, 255)
    a[a[:, :, 3] < 14] = 0

    # Feather last rows
    ys2 = np.where(a[:, :, 3] > 12)[0]
    if len(ys2):
        yb = int(ys2[-1])
        feather = max(5, base_h // 4)
        for y in range(max(y0, yb - feather), yb + 1):
            k = (yb - y) / max(1.0, feather)
            a[y, :, 3] *= 0.05 + 0.95 * (k**1.2)

    return np.round(a).astype(np.uint8)


def process(name: str, kind: str) -> None:
    path = OUT / name
    if not path.exists():
        print("skip missing", name)
        return
    arr = chroma_key(np.array(Image.open(path).convert("RGBA")))
    arr = autocrop(arr, pad=1)
    before = int((arr[:, :, 3] > 12).sum())
    arr = strip_base(arr, rock=(kind == "rock"))
    arr = autocrop(arr, pad=0)
    after = int((arr[:, :, 3] > 12).sum())
    Image.fromarray(arr).save(path, optimize=True)
    print(f"{name}: {before}->{after} ({kind}) {arr.shape[1]}x{arr.shape[0]}")


def main() -> None:
    for n in VEG:
        process(n, "veg")
    for n in ROCKS:
        process(n, "rock")
    print("done")


if __name__ == "__main__":
    main()

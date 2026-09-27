# @bellgrave/items

Item catalog for Legend of Kek / Bellgrave: stats, descriptions, icon paths, craft metadata.

**Source of truth:** `docs/legend-of-kek-item-manifest.xlsx`

## Regen

```bash
py -3 scripts/build-item-catalog.py
py -3 scripts/bake-item-icons.py
```

Icons are **painted PNGs** (96×96, magenta-keyed) under `apps/web/public/icons/items/{slug}.png`.

## Stats

NQ budgets from craft level (`B = floor(lv/5)+1`). HQ = ceil(NQ × 1.25) via `hqStats()`.

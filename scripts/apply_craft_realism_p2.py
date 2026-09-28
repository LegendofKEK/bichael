#!/usr/bin/env python3
"""P2 craft realism: unused-base sinks, softlocks, broken mat names, chain polish."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "docs" / "legend-of-kek-item-manifest.xlsx"
CATALOG = REPO / "packages" / "items" / "src" / "catalog.json"
CATALOG_TS = REPO / "packages" / "items" / "src" / "catalog.generated.ts"
BUILD = REPO / "scripts" / "build-item-catalog.py"
ICONS = REPO / "apps" / "web" / "public" / "icons" / "items"

TIMES = "\u00d7"
EM = "\u2014"


def craft_line(skill: str, level: int, materials: str) -> str:
    return f"Craft: {skill} Lv{level} {EM} requires {materials}"


# slug -> (skill label, level, materialsText, optional Data Flag, optional Kind, optional Name)
UPDATES: dict[str, dict] = {
    # --- Softlocks / broken refs ---
    "scale-harness": {
        "Level": 40,
        "Obtained From": craft_line(
            "Leathercraft",
            40,
            f"Scale Hide{TIMES}3, Soft Pelt{TIMES}1, Slag Dust{TIMES}1",
        ),
        "Data Flag": "P2: raw scale hide (was Scale Leather L65 softlock at L40)",
    },
    "palace-plate": {
        "Obtained From": craft_line(
            "Smithing",
            94,
            f"Orichalcum Ingot{TIMES}3, Marble Chip{TIMES}2, Darksteel Goldsmith Wire{TIMES}2, Goldsmith Filigree{TIMES}1, Throne Dust{TIMES}1",
        ),
        "Data Flag": "P2: fix unresolvable Wire/Filigree names; precursors below L94",
    },
    # --- Lumber bark consistency ---
    "ashbeam-lumber": {
        "Obtained From": craft_line(
            "Woodworking", 1, f"Ashbeam Log{TIMES}2, Bark Strip{TIMES}1, Pale Dust{TIMES}1"
        ),
        "Data Flag": "P2: bark-strip sink (match bloodbeam)",
    },
    "bellwood-lumber": {
        "Obtained From": craft_line(
            "Woodworking", 65, f"Bellwood Log{TIMES}2, Bark Strip{TIMES}1, Bell Dust{TIMES}1"
        ),
        "Data Flag": "P2: bark-strip sink",
    },
    "relic-staff-blank": {
        "Obtained From": craft_line(
            "Woodworking",
            100,
            f"Bellwood Lumber{TIMES}2 or Petrified Lumber{TIMES}2, Ancient Branch{TIMES}1, Orichalcum Ingot{TIMES}1, Throne Dust{TIMES}2",
        ),
        "Data Flag": "P2: petrified-lumber + ancient-branch sinks",
    },
    # --- Smithing scrap / masonry ---
    "bronze-ingot": {
        "Obtained From": craft_line(
            "Smithing",
            1,
            f"Copper Ore{TIMES}2, Tin Ore{TIMES}1 or Metal Scrap{TIMES}5, Pale Dust{TIMES}1",
        ),
        "Data Flag": "P2: metal-scrap recycle path",
    },
    "bronze-shield": {
        "Obtained From": craft_line(
            "Smithing", 14, f"Bronze Ingot{TIMES}3, Cobble{TIMES}2, Pale Dust{TIMES}1"
        ),
        "Data Flag": "P2: cobble sink (weighted rim)",
    },
    "steel-arrowhead": {
        "Obtained From": craft_line(
            "Smithing", 40, f"Steel Ingot{TIMES}1, Slag Dust{TIMES}1"
        ),
        "Data Flag": "P2: slag-tier dust (was Ash Dust)",
    },
    # --- Wood shield / brick ---
    "buckler-wood": {
        "Obtained From": craft_line(
            "Woodworking", 4, f"Ashbeam Lumber{TIMES}2, Cracked Brick{TIMES}1, Pale Dust{TIMES}1"
        ),
        "Data Flag": "P2: cracked-brick sink",
    },
    # --- Glass / stone ---
    "glass-bead": {
        "Obtained From": craft_line(
            "Goldsmithing",
            1,
            f"River Sand{TIMES}2, Potter's Clay{TIMES}1 or Limestone{TIMES}3, Pale Dust{TIMES}1",
        ),
        "Data Flag": "P2: limestone silica alt path",
    },
    "goldsmith-chip-mount": {
        "Obtained From": craft_line(
            "Goldsmithing",
            13,
            f"Copper Ore{TIMES}1 or Tile Shard{TIMES}2, Pale Dust{TIMES}1",
        ),
        "Data Flag": "P2: tile-shard mosaic sink",
    },
    # --- Cloth / velvet dust ---
    "velvet-thread": {
        "Obtained From": craft_line(
            "Clothcraft",
            60,
            f"Velvet Fiber{TIMES}2 or Velvet Dust{TIMES}3, Bell Dust{TIMES}1",
        ),
        "Data Flag": "P2: velvet-dust recycle alt",
    },
    # --- Leather polish ---
    "mercenary-mantle": {
        "Obtained From": craft_line(
            "Leathercraft", 32, f"Leather{TIMES}1, Climbing Cord{TIMES}1, Ash Dust{TIMES}1"
        ),
        "Data Flag": "P2: use leather intermediate (not raw Soft Pelt)",
    },
    # --- Bone arrow uses arrowhead ---
    "bone-arrow": {
        "Obtained From": craft_line(
            "Bonecraft", 12, f"Bone Arrowhead{TIMES}1, Ashbeam Lumber{TIMES}1, Pale Dust{TIMES}1"
        ),
        "Data Flag": "P2: consume bone-arrowhead intermediate",
    },
    "bone-arrowhead": {
        "Kind": "intermediate",
        "Data Flag": "P2: reclassify intermediate (feeds bone-arrow)",
    },
    # --- Alchemy unused sinks ---
    "prism-powder": {
        "Obtained From": craft_line(
            "Alchemy",
            38,
            f"Distilled Ash{TIMES}1, Glass Bead{TIMES}1, Insect Wing{TIMES}1, Slag Dust{TIMES}1",
        ),
        "Data Flag": "P2: insect-wing sink",
    },
    "darksteel-bolt": {
        "Obtained From": craft_line(
            "Woodworking",
            75,
            f"Bellwood Lumber{TIMES}1, Darksteel Ingot{TIMES}1, Acid Bolt Compound{TIMES}1, Bell Dust{TIMES}1",
        ),
        "Data Flag": "P2: acid-bolt-compound sink",
    },
    # --- Iron arrowhead sink: retarget ashbeam-flatbow ammo kit feel via steel? Add iron path on bronze-arrow tier clone ---
    # Use iron-arrowhead in ashbeam-siege-stock -> rename materials as iron-tipped stake
    "ashbeam-siege-stock": {
        "Obtained From": craft_line(
            "Woodworking",
            18,
            f"Ashbeam Lumber{TIMES}1, Iron Arrowhead{TIMES}1, Ash Dust{TIMES}1",
        ),
        "Data Flag": "P2: iron-arrowhead sink",
    },
}


def ensure_scale_harness_row(ws, col: dict) -> None:
    """MVP Scale Harness lives as build stub only — promote into manifest."""
    slug_i = col["Icon Slug"]
    for row in ws.iter_rows(min_row=2):
        if row[slug_i].value == "scale-harness":
            return
    u = UPDATES["scale-harness"]
    values = [None] * len(col)
    # map by header index
    def setv(header, val):
        if header in col:
            values[col[header]] = val
    setv("Status", "MVP")
    setv("Icon Slug", "scale-harness")
    setv("Item Name", "Scale Harness")
    setv("Category", "Leathercraft")
    setv("Craft", "Leathercraft")
    setv("Level", u.get("Level", 40))
    setv("Kind", "equipment")
    setv("Jobs / Notes", "Rogue / Knight / Fighter — body")
    setv("Obtained From", u["Obtained From"])
    setv("Data Flag", u.get("Data Flag", "P2: promoted from MVP stub"))
    ws.append(values)
    print("Added scale-harness row to manifest")


def update_xlsx() -> list[str]:
    wb = openpyxl.load_workbook(MANIFEST)
    ws = wb["Master Item List"]
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {h: i for i, h in enumerate(headers)}
    ensure_scale_harness_row(ws, col)
    slug_i = col["Icon Slug"]
    touched: list[str] = []
    for row in ws.iter_rows(min_row=2):
        slug = row[slug_i].value
        if not slug or slug not in UPDATES:
            continue
        u = UPDATES[slug]
        if "Item Name" in u and "Item Name" in col:
            row[col["Item Name"]].value = u["Item Name"]
        if "Level" in u and "Level" in col:
            row[col["Level"]].value = u["Level"]
        if "Kind" in u and "Kind" in col:
            row[col["Kind"]].value = u["Kind"]
        if "Obtained From" in u and "Obtained From" in col:
            row[col["Obtained From"]].value = u["Obtained From"]
        if "Data Flag" in u and "Data Flag" in col:
            row[col["Data Flag"]].value = u["Data Flag"]
        touched.append(slug)
    missing = sorted(set(UPDATES) - set(touched))
    if missing:
        raise SystemExit(f"Slugs not found in manifest: {missing}")
    wb.save(MANIFEST)
    return touched


def patch_catalog_json() -> None:
    items = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_slug = {it["slug"]: it for it in items}
    for slug, u in UPDATES.items():
        it = by_slug[slug]
        if "Kind" in u:
            it["kind"] = u["Kind"]
        if "Level" in u:
            it["craftLevel"] = u["Level"]
        if "Item Name" in u:
            it["name"] = u["Item Name"]
        if "Obtained From" in u:
            m = re.search(r"requires\s+(.+)$", u["Obtained From"], re.I)
            if m:
                mats = m.group(1).strip().rstrip(".")
                it.setdefault("recipe", {"kek": 1000})
                it["recipe"]["materialsText"] = mats
                it["recipe"]["kek"] = it["recipe"].get("kek", 1000)
    CATALOG.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def patch_build_stub() -> None:
    text = BUILD.read_text(encoding="utf-8")
    old = f'Scale Leather{TIMES}3, Bell Dust{TIMES}1'
    new = f'Scale Hide{TIMES}3, Soft Pelt{TIMES}1, Slag Dust{TIMES}1'
    # Also handle if file was saved with literal mojibake / x
    variants = [
        (f"Scale Leather{TIMES}3, Bell Dust{TIMES}1", new),
        ("Scale Leather\u00d73, Bell Dust\u00d71", new),
        ("Scale Leatherx3, Bell Dustx1", f"Scale Hidex3, Soft Peltx1, Slag Dustx1"),
        ("Scale LeatherA-3, Bell DustA-1", f"Scale HideA-3, Soft PeltA-1, Slag DustA-1"),
    ]
    replaced = False
    for a, b in variants:
        if a in text:
            text = text.replace(a, b)
            replaced = True
            break
    if not replaced:
        # regex fallback around scale-harness stub
        text2, n = re.subn(
            r'(slug": "scale-harness"[\s\S]*?"materialsText": ")([^"]+)(")',
            rf'\1{new}\3',
            text,
            count=1,
        )
        if n:
            text = text2
            replaced = True
    if not replaced:
        print("WARN: could not patch scale-harness stub in build-item-catalog.py")
    else:
        BUILD.write_text(text, encoding="utf-8")
        print("Patched build-item-catalog.py scale-harness stub")


def regen_ts_from_json() -> None:
    """Keep catalog.generated.ts in sync without full xlsx rebuild (ids stable)."""
    items = json.loads(CATALOG.read_text(encoding="utf-8"))
    body = json.dumps(items, indent=2, ensure_ascii=False)
    ts = "\n".join(
        [
            "/* eslint-disable */",
            "/** Auto-generated by scripts/build-item-catalog.py — do not edit by hand. */",
            "/** Source: docs/legend-of-kek-item-manifest.xlsx */",
            'import type { ItemDef } from "./types";',
            "",
            f"export const CATALOG: ItemDef[] = {body} as ItemDef[];",
            "",
            "export const CATALOG_BY_ID: Record<number, ItemDef> = Object.fromEntries(",
            "  CATALOG.map((i) => [i.id, i]),",
            ");",
            "",
            "export const CATALOG_BY_SLUG: Record<string, ItemDef> = Object.fromEntries(",
            "  CATALOG.map((i) => [i.slug, i]),",
            ");",
            "",
        ]
    )
    CATALOG_TS.write_text(ts, encoding="utf-8")


def main() -> None:
    touched = update_xlsx()
    print(f"Updated {len(touched)} manifest rows: {', '.join(touched)}")
    patch_catalog_json()
    print("Patched catalog.json")
    patch_build_stub()
    regen_ts_from_json()
    print("Regenerated catalog.generated.ts")


if __name__ == "__main__":
    main()

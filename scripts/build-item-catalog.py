"""Build Bellgrave item catalog from docs/legend-of-kek-item-manifest.xlsx (source of truth)."""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

try:
    import openpyxl
except ImportError as e:
    raise SystemExit("pip/py -m pip install openpyxl") from e

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "legend-of-kek-item-manifest.xlsx"
OUT_JSON = ROOT / "packages" / "items" / "src" / "catalog.json"
OUT_TS = ROOT / "packages" / "items" / "src" / "catalog.generated.ts"
OUT_WEAPON_TOKENS = ROOT / "packages" / "combat" / "src" / "weapon-tokens.generated.ts"

CRAFT_SKILL = {
    "Smithing": "smithing",
    "Woodworking": "woodworking",
    "Leathercraft": "leathercraft",
    "Clothcraft": "clothcraft",
    "Bonecraft": "bonecraft",
    "Goldsmithing": "goldsmithing",
    "Alchemy": "alchemy",
    "Cooking": "cooking",
    "Cooking (Bait)": "cooking",
}

# Preserve MVP token IDs (must match @bellgrave/items ITEM + server starters)
LEGACY_IDS = {
    "Ashbeam Staff": 1,
    "Linen Robe": 2,
    "Potion": 3,
    "Iron Sword": 4,
    "Iron Mail": 5,
    "Iron Dagger": 6,
    "Leather Vest": 7,
    "Iron Greatsword": 8,
    "Scale Harness": 9,
}

# --- helpers (stats / slots / copy) ---

def slugify(name: str) -> str:
    s = name.lower().replace("'", "").replace("'", "").replace("×", "x")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def budget(lv: int) -> int:
    return max(1, lv // 5 + 1)


# Per-slug combat stat overrides (rare drops / hand-tuned gear). Applied after build_stats().
STAT_OVERRIDES: dict[str, dict] = {
    "chainmail": {"str": 5, "dex": 5, "agi": 5, "def": 10},
}


def parse_jobs(jobs: str) -> list[str] | str:
    j = (jobs or "").strip()
    if not j or j.lower().startswith("mat") or j.lower() in (
        "medicine",
        "spell",
        "ammo",
        "sub",
        "grip",
        "ranged",
        "head",
        "body",
        "hands",
        "legs",
        "feet",
        "ring",
        "earring",
        "fishing",
    ):
        if "all" in j.lower():
            return "all"
        return []
    mapping = {
        "knight": "knight",
        "fighter": "fighter",
        "bm": "battlemage",
        "rogue": "rogue",
        "tim": "tim",
        "time mage": "tim",
        "sorc": "sorcerer",
        "sorcerer": "sorcerer",
        "cleric": "cleric",
    }
    found: list[str] = []
    low = j.lower()
    if "all jobs" in low or low == "all":
        return "all"
    for key, val in mapping.items():
        if key in low and val and val not in found:
            found.append(val)
    if "mage" in low and "tim" not in found:
        for v in ("tim", "sorcerer", "cleric", "battlemage"):
            if v not in found:
                found.append(v)
    return found or []


def infer_slot(name: str, kind: str) -> str | None:
    if kind != "equipment":
        return None
    n = name.lower()
    if "arrow" in n or "bolt" in n:
        return "ammo"
    if "grip" in n:
        return "grip"
    if any(k in n for k in ("shield", "buckler", "targe")):
        return "sub"
    if any(k in n for k in ("bow", "crossbow")):
        return "ranged"
    if any(k in n for k in ("ring", "bangle", "signet", "sigil")) and "earring" not in n:
        return "ring"
    if "earring" in n:
        return "earring"
    if any(
        k in n
        for k in (
            "circlet",
            "torque",
            "coronet",
            "bandana",
            "cap",
            "hat",
            "hood",
            "sallet",
            "mask",
            "gorget",
        )
    ):
        return "head"
    if any(k in n for k in ("mittens", "gloves", "gauntlets", "cuffs", "mitts", "bracer")):
        return "hands"
    if any(
        k in n
        for k in (
            "leggings",
            "trousers",
            "slops",
            "slacks",
            "cuisses",
            "breeches",
            "hose",
            "chaps",
            "subligar",
            "legguards",
        )
    ):
        return "legs"
    if any(k in n for k in ("sandals", "boots", "socks", "pumps", "sabatons", "greaves")):
        return "feet"
    if any(
        k in n
        for k in (
            "robe",
            "vest",
            "mail",
            "harness",
            "coat",
            "breastplate",
            "hauberk",
            "plate",
            "jerkin",
            "mantle",
            "bliaut",
            "doublet",
            "shirt",
            "cuirass",
            "stole",
            "cape",
            "sash",
            "belt",
        )
    ):
        return "body"
    return "main"


def is_two_hand(name: str, slot: str | None) -> bool:
    n = name.lower()
    if slot != "main":
        return False
    return any(
        k in n
        for k in ("staff", "greatsword", "great axe", "greataxe", "war bow", "bow", "quarterstaff")
    )


def weapon_family(name: str) -> str | None:
    n = name.lower()
    if "knuckle" in n:
        return "knuckles"
    if "dagger" in n or "knife" in n or "kris" in n:
        return "dagger"
    if "greatsword" in n:
        return "greatsword"
    if "axe" in n:
        return "axe"
    if "club" in n or "mace" in n:
        return "club"
    if "staff" in n or "quarterstaff" in n or "cane" in n or "wand" in n or "rod" in n:
        return "staff"
    if "bow" in n or "crossbow" in n:
        return None  # ranged — no TP family yet
    if any(k in n for k in ("sword", "blade")):
        return "sword"
    return None


def build_stats(name: str, kind: str, lv: int, slot: str | None, jobs: list[str] | str) -> dict:
    if kind in ("base", "intermediate", "filler"):
        return {}
    B = budget(max(1, lv))
    stats: dict = {}
    n = name.lower()

    if kind in ("consumable", "bait"):
        if kind == "bait" or "bait" in n:
            return {}
        if "ether" in n or "mana" in n:
            stats["mp"] = 40 + B * 8
        elif "potion" in n or "panacea" in n or "remedy" in n or "serum" in n:
            stats["hp"] = 50 + B * 10
        elif "elixir" in n and "enhancing" not in n:
            stats["hp"] = 80 + B * 6
            stats["mp"] = 80 + B * 6
        elif "feast" in n or "banquet" in n:
            for a in ("str", "dex", "vit", "agi", "int", "mnd"):
                stats[a] = 3 + B // 5
            stats["hp"] = 30 + B * 4
            stats["mp"] = 30 + B * 4
        elif "steak" in n or "grill" in n:
            stats["str"] = 3 + B // 4
            stats["atk"] = 2 + B // 3
        elif "bread" in n or "ration" in n or "biscuit" in n:
            stats["hp"] = 25 + B * 4
        else:
            stats["hp"] = 20 + B * 3
        return stats

    if not slot:
        return {}
    fam = weapon_family(name) or "sword"
    job_list = jobs if isinstance(jobs, list) else []
    heavy = any(j in job_list for j in ("knight", "fighter"))
    mage = any(j in job_list for j in ("tim", "sorcerer", "cleric", "battlemage"))
    rogue = "rogue" in job_list

    if slot == "main":
        if fam == "staff":
            stats["mab"] = B + 3
            stats["mnd"] = 1 + B // 3
        elif fam == "greatsword":
            stats["atk"] = math.floor(B * 1.6) + 3
            stats["str"] = 2 + B // 3
        elif fam == "dagger":
            stats["atk"] = B + 1
            stats["dex"] = 2 + B // 3
        elif fam == "club":
            stats["atk"] = B + 1
            stats["mnd"] = 1 + B // 3
        elif fam == "axe":
            stats["atk"] = B + 2
            stats["str"] = 2 + B // 4
        elif fam == "knuckles":
            stats["atk"] = B + 1
            stats["str"] = 2 + B // 3
        else:
            stats["atk"] = B + 2
            stats["str"] = 1 + B // 4
            if mage:
                stats["int"] = 1 + B // 5
    elif slot == "ranged":
        stats["atk"] = B + 1
        stats["agi"] = 1 + B // 3
    elif slot == "ammo":
        stats["atk"] = max(1, B // 3)
    elif slot == "sub":
        stats["def"] = B + 3
        stats["vit"] = 1 + B // 4
    elif slot == "grip":
        stats["acc"] = B // 2 + 1 if not mage else 0
        if mage:
            stats["mab"] = B // 2 + 1
    elif slot == "body":
        stats["def"] = B + 2
        stats["hp"] = 5 + B
        if heavy:
            stats["vit"] = 1 + B // 3
        elif rogue:
            stats["agi"] = 1 + B // 3
        elif mage:
            stats["mp"] = 5 + B
            stats["int"] = 1 + B // 3
    elif slot in ("head", "hands", "feet"):
        stats["def"] = math.floor(B * 0.6) + 1
    elif slot == "legs":
        stats["def"] = math.floor(B * 0.8) + 1
    elif slot == "ring":
        stats["str"] = B // 2 + 1
    elif slot == "earring":
        stats["mnd"] = B // 2 + 1
    return stats


def describe(name: str, kind: str, craft_skill: str | None, lv: int | None, obtained: str) -> str:
    if obtained and not obtained.lower().startswith("craft"):
        return f"{name}. {obtained}."
    n = name.lower()
    if kind == "base":
        return f"{name} scavenged across Bellgrave's zones. A crafting precursor."
    if kind in ("intermediate", "filler"):
        return f"{name} — synth material from Bellgrave crafts. Feed into higher recipes."
    if kind == "bait":
        return f"{name} for dry troughs and mooring pools. Attracts fossil fish."
    if kind == "consumable":
        if "ether" in n:
            return f"{name}. Distilled ash tonic that restores magic."
        if "potion" in n:
            return f"{name}. Desiccated grain medicine for wounds of the dead city."
        return f"{name}. Consumable from Bellgrave's alchemy and cookfires."
    tier = "ruined" if (lv or 0) < 20 else "tempered" if (lv or 0) < 60 else "throne-forged"
    return f"{name}. {tier.capitalize()} gear from Bellgrave's craft halls."


def consume_effect(name: str, kind: str, stats: dict) -> dict | None:
    if kind == "bait":
        return {"foodDurationSec": 0}
    if kind != "consumable":
        return None
    out: dict = {}
    if "hp" in stats:
        out["hp"] = stats["hp"]
    if "mp" in stats:
        out["mp"] = stats["mp"]
    foodish = any(
        k in name.lower()
        for k in ("feast", "banquet", "steak", "bread", "biscuit", "soup", "stew", "jerky", "sashimi")
    )
    if foodish:
        out["foodDurationSec"] = 1800
    return out or None


def parse_materials(obtained: str) -> str | None:
    if not obtained:
        return None
    m = re.search(r"requires\s+(.+)$", obtained, re.I)
    if m:
        return m.group(1).strip().rstrip(".")
    if obtained.lower().startswith("craft"):
        return obtained
    return None


def map_kind(raw: str) -> str:
    k = (raw or "").strip().lower()
    if k in ("base", "intermediate", "equipment", "consumable", "filler", "bait"):
        return k
    return "intermediate"


def load_prior_ids() -> dict[str, int]:
    if not OUT_JSON.exists():
        return {}
    try:
        data = json.loads(OUT_JSON.read_text(encoding="utf-8"))
        return {it["slug"]: it["id"] for it in data if "slug" in it and "id" in it}
    except Exception:
        return {}


def main() -> None:
    if not MANIFEST.exists():
        raise SystemExit(f"Missing manifest: {MANIFEST}")

    wb = openpyxl.load_workbook(MANIFEST, data_only=True)
    ws = wb["Master Item List"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    assert header[1] == "Icon Slug" and header[2] == "Item Name", header

    prior = load_prior_ids()
    used_ids: set[int] = set()
    items: list[dict] = []

    # Pre-reserve legacy IDs
    for _name, lid in LEGACY_IDS.items():
        used_ids.add(lid)

    pending: list[dict] = []
    for r in rows[1:]:
        if not r or not r[2]:
            continue
        status, slug, name, _category, craft, level, kind_raw, jobs_notes, obtained, *_rest = (
            list(r) + [None] * 11
        )[:11]
        slug = (slug or slugify(str(name))).strip()
        name = str(name).strip()
        # strip pack counts from display name for some fields but keep slug from sheet
        kind = map_kind(str(kind_raw or ""))
        craft_skill = CRAFT_SKILL.get(str(craft).strip()) if craft else None
        lv = int(level) if isinstance(level, (int, float)) and not isinstance(level, bool) else None
        if lv is None and kind == "base":
            lv = None
        elif lv is None:
            lv = 1
        jobs = parse_jobs(str(jobs_notes or ""))
        obtained_s = str(obtained or "").replace("\ufffd", "—").strip()
        materials = parse_materials(obtained_s)

        entry: dict = {
            "slug": slug,
            "name": name,
            "kind": kind,
            "status": status,
            "jobs": jobs,
            "craftLevel": lv,
            "craftSkill": craft_skill,
            "obtained": obtained_s,
            "materials": materials,
        }
        pending.append(entry)

    # Assign IDs: legacy name → prior slug → sequential
    next_id = 10
    for entry in pending:
        name = entry["name"]
        slug = entry["slug"]
        # strip ×N from name for legacy match
        base_name = re.sub(r"×\d+$", "", name).strip()
        if base_name in LEGACY_IDS:
            iid = LEGACY_IDS[base_name]
        elif name in LEGACY_IDS:
            iid = LEGACY_IDS[name]
        elif slug in prior and prior[slug] not in used_ids:
            iid = prior[slug]
            used_ids.add(iid)
        elif slug in prior:
            # conflict — new id
            while next_id in used_ids:
                next_id += 1
            iid = next_id
            used_ids.add(iid)
            next_id += 1
        else:
            while next_id in used_ids:
                next_id += 1
            iid = next_id
            used_ids.add(iid)
            next_id += 1
            # if legacy reserved and somehow free for non-legacy, skip was handled
        if base_name in LEGACY_IDS or name in LEGACY_IDS:
            used_ids.add(iid)
        entry["id"] = iid

    # Build final ItemDef records
    for entry in pending:
        name = entry["name"]
        kind = entry["kind"]
        lv = entry["craftLevel"] or 1
        jobs = entry["jobs"]
        slot = infer_slot(name, kind) if kind == "equipment" else None
        stats = build_stats(name, kind, lv, slot, jobs)
        if entry["slug"] in STAT_OVERRIDES:
            stats = dict(STAT_OVERRIDES[entry["slug"]])
        # pull delay out of stats if old helper put it there — we don't
        delay = None
        if kind == "equipment" and slot == "main":
            fam = weapon_family(name)
            delay = {
                "dagger": 1800,
                "staff": 3600,
                "greatsword": 3800,
                "axe": 2600,
                "club": 2400,
                "knuckles": 2000,
                "sword": 2400,
            }.get(fam or "sword", 2400)

        rec: dict = {
            "id": entry["id"],
            "name": name,
            "description": describe(name, kind, entry["craftSkill"], entry["craftLevel"], entry["obtained"]),
            "icon": f"/icons/items/{entry['slug']}.png",
            "slug": entry["slug"],
            "kind": kind,
        }
        if entry["craftLevel"] is not None and kind != "base":
            rec["craftLevel"] = entry["craftLevel"]
        if entry["craftSkill"]:
            rec["craftSkill"] = entry["craftSkill"]
        if entry["materials"] and kind != "base":
            rec["recipe"] = {"kek": 1000, "materialsText": entry["materials"]}
        if entry["obtained"] and kind == "base":
            rec["obtainedFrom"] = entry["obtained"]
        if stats:
            rec["stats"] = stats
        if delay is not None:
            rec["delayMs"] = delay
        if slot:
            rec["slot"] = slot
        if slot == "main" and is_two_hand(name, slot):
            rec["twoHand"] = True
        if jobs:
            rec["jobRestrict"] = jobs
        ce = consume_effect(name, kind, stats)
        if ce:
            rec["consume"] = ce
        wf = weapon_family(name) if slot == "main" else None
        if wf:
            rec["weaponFamily"] = wf
        items.append(rec)

    items.sort(key=lambda x: x["id"])

    # Ensure MVP starters exist even if absent from the xlsx (stable token IDs).
    by_id = {it["id"]: it for it in items}
    stubs = [
        {
            "id": 6,
            "name": "Iron Dagger",
            "description": "Iron Dagger. Tempered steel for quiet cuts through slag alleys.",
            "icon": "/icons/items/iron-dagger.png",
            "slug": "iron-dagger",
            "kind": "equipment",
            "craftLevel": 23,
            "craftSkill": "smithing",
            "slot": "main",
            "jobRestrict": ["rogue"],
            "stats": {"atk": 6, "dex": 3},
            "delayMs": 1800,
            "weaponFamily": "dagger",
            "recipe": {"kek": 1000, "materialsText": "Iron Ingot×1, Ash Dust×1"},
        },
        {
            "id": 8,
            "name": "Iron Greatsword",
            "description": "Iron Greatsword. Heavy tempered steel for knights and fighters.",
            "icon": "/icons/items/iron-greatsword.png",
            "slug": "iron-greatsword",
            "kind": "equipment",
            "craftLevel": 34,
            "craftSkill": "smithing",
            "slot": "main",
            "twoHand": True,
            "jobRestrict": ["knight", "fighter"],
            "stats": {"atk": 14, "str": 4},
            "delayMs": 3800,
            "weaponFamily": "greatsword",
            "recipe": {"kek": 1000, "materialsText": "Iron Ingot×4, Ash Dust×1"},
        },
        {
            "id": 9,
            "name": "Scale Harness",
            "description": "Scale Harness. Light hide and scale for quiet steps through slag alleys.",
            "icon": "/icons/items/scale-harness.png",
            "slug": "scale-harness",
            "kind": "equipment",
            "craftLevel": 40,
            "craftSkill": "leathercraft",
            "slot": "body",
            "jobRestrict": ["rogue", "knight", "fighter"],
            "stats": {"def": 10, "hp": 20, "agi": 2},
            "recipe": {"kek": 1000, "materialsText": "Stone Scale×3, Soft Pelt×1, Ash Dust×1"},
        },
    ]
    for stub in stubs:
        if stub["id"] not in by_id:
            items.append(stub)
            by_id[stub["id"]] = stub
            print(f"Injected MVP stub id={stub['id']} {stub['name']}")

    items.sort(key=lambda x: x["id"])

    # Deduplicate IDs if any collision slipped through
    seen: set[int] = set()
    next_id = max((it["id"] for it in items), default=10) + 1
    for it in items:
        if it["id"] in seen:
            while next_id in seen:
                next_id += 1
            it["id"] = next_id
            next_id += 1
        seen.add(it["id"])
    items.sort(key=lambda x: x["id"])

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "/* eslint-disable */",
        "/** Auto-generated by scripts/build-item-catalog.py — do not edit by hand. */",
        "/** Source: docs/legend-of-kek-item-manifest.xlsx */",
        'import type { ItemDef } from "./types";',
        "",
        f"export const CATALOG: ItemDef[] = {json.dumps(items, indent=2, ensure_ascii=False)} as ItemDef[];",
        "",
        "export const CATALOG_BY_ID: Record<number, ItemDef> = Object.fromEntries(",
        "  CATALOG.map((i) => [i.id, i]),",
        ") as Record<number, ItemDef>;",
        "",
        "export const CATALOG_BY_SLUG: Record<string, ItemDef> = Object.fromEntries(",
        "  CATALOG.map((i) => [i.slug, i]),",
        ") as Record<string, ItemDef>;",
        "",
    ]
    OUT_TS.write_text("\n".join(lines), encoding="utf-8")

    # Weapon token map for combat TP skills
    token_lines = [
        "/* eslint-disable */",
        "/** Auto-generated from item catalog — main-hand tokenId → weapon family. */",
        'import type { WeaponType } from "./weapon-tp";',
        "",
        "export const WEAPON_TOKEN_TYPES: Record<number, WeaponType> = {",
    ]
    for it in items:
        wf = it.get("weaponFamily")
        if wf and it.get("slot") == "main":
            token_lines.append(f'  {it["id"]}: "{wf}", // {it["slug"]}')
    token_lines += ["} as const;", ""]
    OUT_WEAPON_TOKENS.write_text("\n".join(token_lines), encoding="utf-8")

    kinds: dict[str, int] = {}
    for it in items:
        kinds[it["kind"]] = kinds.get(it["kind"], 0) + 1
    print(f"Wrote {len(items)} items -> {OUT_JSON}")
    print("kinds", kinds)
    print("legacy", {n: LEGACY_IDS[n] for n in LEGACY_IDS})
    print(f"weapon tokens -> {OUT_WEAPON_TOKENS}")


if __name__ == "__main__":
    main()

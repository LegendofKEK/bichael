import {
  CRAFT_SKILLS,
  CRAFT_SKILL_LABEL,
  CATALOG_BY_SLUG,
  closeCraftRecipes,
  emptyCraftSkills,
  getItem,
  ownedMatQty,
  type CraftSkill,
} from "@bellgrave/items";
import type { SnapshotMessage } from "@bellgrave/protocol";
import { useMemo, useState } from "react";
import { send } from "./net";

type Props = {
  you: SnapshotMessage["you"];
  onClose: () => void;
};

function isMatKind(kind: string | undefined): boolean {
  return kind === "base" || kind === "intermediate" || kind === "filler" || kind === "bait";
}

export function CraftingPanel({ you, onClose }: Props) {
  const [skill, setSkill] = useState<CraftSkill | "all">("all");
  const craftSkills = you.craftSkills ?? emptyCraftSkills();

  const closeList = useMemo(
    () =>
      closeCraftRecipes(you.inventory, you.baseMats ?? {}, craftSkills, {
        skill,
        limit: 14,
      }),
    [you.inventory, you.baseMats, craftSkills, skill],
  );

  const matRows = useMemo(() => {
    const rows: { slug: string; amount: number; name: string; icon: string }[] = [];
    const seen = new Set<string>();
    for (const [slug, amount] of Object.entries(you.baseMats ?? {})) {
      if (amount <= 0) continue;
      const def = CATALOG_BY_SLUG[slug];
      if (!def) continue;
      rows.push({ slug, amount, name: def.name, icon: def.icon });
      seen.add(slug);
    }
    for (const i of you.inventory) {
      const def = getItem(i.tokenId);
      if (!def || !isMatKind(def.kind) || seen.has(def.slug)) continue;
      rows.push({ slug: def.slug, amount: i.amount, name: def.name, icon: def.icon });
      seen.add(def.slug);
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [you.inventory, you.baseMats]);

  return (
    <div className="cmd-panel craft-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-kicker">Synthesis</div>
          <div className="cmd-panel-title">Crafting</div>
          <div className="cmd-panel-sub">Close to craft · your materials</div>
        </div>
        <button type="button" onClick={onClose} className="cmd-close-btn">
          Close
        </button>
      </div>

      <div className="craft-skill-row">
        <button
          type="button"
          className={`cmd-pill-tab${skill === "all" ? " on" : ""}`}
          onClick={() => setSkill("all")}
        >
          All
        </button>
        {CRAFT_SKILLS.map((s) => {
          const lv = craftSkills[s]?.level ?? 1;
          return (
            <button
              key={s}
              type="button"
              className={`cmd-pill-tab${skill === s ? " on" : ""}`}
              title={`${CRAFT_SKILL_LABEL[s]} Lv.${lv}`}
              onClick={() => setSkill(s)}
            >
              {CRAFT_SKILL_LABEL[s]}
              <span className="craft-chip-lv">{lv}</span>
            </button>
          );
        })}
      </div>

      <div className="cmd-section-label">Close to crafting</div>
      <div className="craft-close-list">
        {closeList.length === 0 && (
          <div className="craft-empty">
            Gather materials in Pale Hollow — recipes you nearly afford will show here.
          </div>
        )}
        {closeList.map((c) => {
          const pct = Math.round(c.matFrac * 100);
          return (
            <div key={c.def.id} className="craft-recipe-row">
              <img src={c.def.icon} alt="" width={40} height={40} className="craft-icon" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="craft-recipe-name">
                  {c.def.name}
                  <span className="craft-recipe-skill">
                    {CRAFT_SKILL_LABEL[c.def.craftSkill!]} Lv.{c.needLevel}
                  </span>
                </div>
                <div className="craft-mat-line">
                  {c.materials.map((m) => {
                    const have = ownedMatQty(m.slug, you.inventory, you.baseMats ?? {});
                    const ok = have >= m.qty;
                    return (
                      <span key={m.slug} style={{ color: ok ? "#8dcf8a" : "#d4a070" }}>
                        {m.name} {have}/{m.qty}
                      </span>
                    );
                  })}
                </div>
                <div className="craft-progress">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button
                type="button"
                className={`cmd-mini-btn${c.canCraft ? " on" : ""}`}
                disabled={!c.canCraft}
                onClick={() => send({ type: "craft", itemId: c.def.id })}
              >
                {c.canCraft ? "Craft" : c.skillLevel < c.needLevel ? `Lv ${c.needLevel}` : `${pct}%`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="cmd-section-label">Materials</div>
      <div className="craft-mat-grid">
        {matRows.length === 0 && <div className="craft-empty">No materials yet</div>}
        {matRows.map((m) => (
          <div key={m.slug} className="craft-mat-cell" title={m.name}>
            <img src={m.icon} alt="" width={36} height={36} className="craft-icon" />
            <div style={{ fontSize: 11, lineHeight: 1.2 }}>{m.name}</div>
            <div style={{ opacity: 0.65, fontSize: 11 }}>×{m.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

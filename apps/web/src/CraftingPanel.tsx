import {
  CRAFT_SKILLS,
  CRAFT_SKILL_LABEL,
  CATALOG_BY_SLUG,
  closeCraftRecipes,
  craftXpToNext,
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

  const focusSkill: CraftSkill | null = skill === "all" ? null : skill;
  const focusRow = focusSkill ? craftSkills[focusSkill] : null;
  const focusNeed = focusRow ? craftXpToNext(focusRow.level ?? 1) : 0;

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
          const xp = craftSkills[s]?.xp ?? 0;
          const need = craftXpToNext(lv);
          return (
            <button
              key={s}
              type="button"
              className={`cmd-pill-tab${skill === s ? " on" : ""}`}
              title={`${CRAFT_SKILL_LABEL[s]} Lv.${lv} — ${xp}/${need} XP`}
              onClick={() => setSkill(s)}
            >
              {CRAFT_SKILL_LABEL[s]}
              <span className="craft-chip-lv">{lv}</span>
            </button>
          );
        })}
      </div>

      {focusRow && focusSkill && (
        <div className="craft-skill-xp" title={`${focusRow.xp}/${focusNeed} XP`}>
          <span>
            {CRAFT_SKILL_LABEL[focusSkill]} XP {focusRow.xp}/{focusNeed}
          </span>
          <div className="craft-progress">
            <i style={{ width: `${Math.min(100, (focusRow.xp / Math.max(1, focusNeed)) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="cmd-section-label">Close to crafting</div>
      <div className="craft-close-list">
        {closeList.length === 0 && (
          <div className="craft-empty">
            Gather materials in Pale Hollow — recipes you nearly afford will show here.
          </div>
        )}
        {closeList.map((c) => {
          const pct = Math.round(c.matFrac * 100);
          const groups = c.materialGroups ?? c.materials.map((m) => ({ options: [m] }));
          const kekCost = c.def.recipe?.kek ?? 0;
          let kekBal = 0n;
          try {
            kekBal = BigInt(you.lok?.kek ?? "0");
          } catch {
            kekBal = 0n;
          }
          const kekOk = kekCost <= 0 || kekBal >= BigInt(kekCost);
          const ready = c.canCraft && kekOk;
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
                  {groups.map((g, gi) => {
                    const parts = g.options.map((m) => {
                      const have = ownedMatQty(m.slug, you.inventory, you.baseMats ?? {});
                      const ok = have >= m.qty;
                      return (
                        <span key={m.slug} style={{ color: ok ? "#8dcf8a" : "#d4a070" }}>
                          {m.name} {have}/{m.qty}
                        </span>
                      );
                    });
                    return (
                      <span key={gi} className="craft-mat-group">
                        {parts.map((node, i) => (
                          <span key={i}>
                            {i > 0 ? <span style={{ opacity: 0.55 }}> or </span> : null}
                            {node}
                          </span>
                        ))}
                        {gi < groups.length - 1 ? <span style={{ opacity: 0.45 }}> · </span> : null}
                      </span>
                    );
                  })}
                </div>
                <div className="craft-mat-line">{kekCost > 0 ? `${kekCost} KEK` : "0 KEK"}</div>
                <div className="craft-progress">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button
                type="button"
                className={`cmd-mini-btn${ready ? " on" : ""}`}
                disabled={!ready}
                onClick={() => send({ type: "craft", itemId: c.def.id })}
              >
                {ready ? "Craft" : !kekOk ? "KEK" : c.skillLevel < c.needLevel ? `Lv ${c.needLevel}` : `${pct}%`}
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

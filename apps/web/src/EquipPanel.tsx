import {
  JOBS,
  applyFreeStats,
  attackFromStats,
  combinedJobStats,
  defenseFromVit,
  isJobId,
  meleeUsesWeaponAttack,
  xpToNextLevel,
  type AttrKey,
} from "@bellgrave/combat";
import { ITEM } from "@bellgrave/config";
import { getItem, itemIcon, itemName, type ItemDef, type ItemStats } from "@bellgrave/items";
import type { SnapshotMessage, UnitSnapshot } from "@bellgrave/protocol";
import { useMemo } from "react";
import { send } from "./net";
import { statTooltip } from "./statTooltips";

const JOB_ABBR: Record<string, string> = {
  knight: "KNT",
  rogue: "ROG",
  cleric: "CLR",
  sorcerer: "SOR",
  fighter: "FTR",
  battlemage: "BMG",
  tim: "TM",
  time_mage: "TM",
};

const PRIMARY_STAT_KEYS = ["def", "atk", "mab", "mdb", "acc", "eva", "hp", "mp"] as const;

function formatSigned(v: number): string {
  return `${v > 0 ? "+" : ""}${v}`;
}

/** Primary defense/stat line + remaining +effects (FFXI-style). */
function formatPrimaryEffects(stats: ItemStats | undefined, consumeHp?: number): string {
  if ((!stats || !Object.keys(stats).length) && consumeHp == null) return "";
  const entries = { ...(stats ?? {}) } as Record<string, number>;
  let primaryKey: string | undefined;
  let primaryVal: number | undefined;

  for (const k of PRIMARY_STAT_KEYS) {
    if (typeof entries[k] === "number") {
      primaryKey = k;
      primaryVal = entries[k];
      delete entries[k];
      break;
    }
  }
  if (primaryKey == null && consumeHp != null) {
    primaryKey = "hp";
    primaryVal = consumeHp;
  }

  const effects = Object.entries(entries)
    .map(([k, v]) => `${k.toUpperCase()} ${formatSigned(v)}`)
    .join(" · ");

  if (primaryKey == null) return effects;
  const head = `${primaryKey.toUpperCase()}: ${primaryVal}`;
  return effects ? `${head} · ${effects}` : head;
}

function formatJobs(jobRestrict: ItemDef["jobRestrict"]): string {
  if (!jobRestrict) return "";
  if (jobRestrict === "all") return "All jobs";
  return jobRestrict.map((j) => JOB_ABBR[j] ?? j.toUpperCase()).join(" · ");
}

function isMatKind(kind: string | undefined): boolean {
  return kind === "base" || kind === "intermediate" || kind === "filler" || kind === "bait";
}

type BagRow = { tokenId: number; amount: number };

/** Slots we can equip today. Others are shown empty for layout only. */
type LiveSlot = "main" | "body";

type SlotDef = {
  id: string;
  label: string;
  live?: LiveSlot;
  tokenFor?: number;
};

/** Bellgrave paperdoll — only Main + Body are live in MVP. */
const SLOTS: SlotDef[] = [
  { id: "main", label: "Main", live: "main", tokenFor: ITEM.STAFF_ASHBEAM },
  { id: "sub", label: "Sub" },
  { id: "range", label: "Range" },
  { id: "ammo", label: "Ammo" },
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "ear1", label: "Ear" },
  { id: "ear2", label: "Ear" },
  { id: "body", label: "Body", live: "body", tokenFor: ITEM.ROBE_LINEN },
  { id: "hands", label: "Hands" },
  { id: "ring1", label: "Ring" },
  { id: "ring2", label: "Ring" },
  { id: "back", label: "Back" },
  { id: "waist", label: "Waist" },
  { id: "legs", label: "Legs" },
  { id: "feet", label: "Feet" },
];

const STAT_ORDER = [
  ["STR", "str"],
  ["DEX", "dex"],
  ["VIT", "vit"],
  ["AGI", "agi"],
  ["INT", "int"],
  ["MND", "mnd"],
] as const;

type Props = {
  you: SnapshotMessage["you"];
  me: UnitSnapshot;
  onClose: () => void;
};

export function EquipPanel({ you, me, onClose }: Props) {
  const weaponBonus = you.equip.main ? 10 : 0;
  const bodyBonus = you.equip.body ? 4 : 0;
  const job = isJobId(you.job) ? you.job : "time_mage";
  const sub = you.subjob && isJobId(you.subjob) ? you.subjob : null;
  const weaponAttack = meleeUsesWeaponAttack(job);
  const stance = weaponAttack ? "none" : me.buffs.flux ? "flux" : me.buffs.aether ? "aether" : "none";
  const stats = applyFreeStats(combinedJobStats(job, you.level, sub), you.freeStats ?? {});
  const attack = attackFromStats(stats, stance, weaponBonus, weaponAttack ? { physical: true } : undefined);
  const defense = defenseFromVit(stats.vit) + bodyBonus;
  const freeLeft = you.freeStatPoints ?? 0;
  const freeStats = you.freeStats ?? { str: 0, dex: 0, vit: 0, agi: 0, int: 0, mnd: 0 };
  const now = Date.now();
  const tpPct = Math.min(100, Math.floor((me.tp / 3000) * 100));
  const xpNeed = xpToNextLevel(you.level);
  const xpHave = Math.max(0, you.xp);
  const xpLeft = Math.max(0, xpNeed - xpHave);
  const jobName = JOBS[you.job]?.name ?? you.job;
  const stanceLabel = job === "knight"
    ? me.buffs.bulwarkUntil > now
      ? " · Bulwark"
      : me.buffs.sentinelUntil > now
        ? " · Sentinel"
        : me.buffs.rampartUntil > now
          ? " · Rampart"
          : ""
    : job === "rogue" && me.buffs.ghostStepUntil > now
      ? " · Ghost Step"
      : job === "fighter" && me.buffs.killingStormUntil > now
        ? " · Killing Storm"
        : job === "fighter" && me.buffs.berserkUntil > now
          ? " · Berserk"
          : job === "fighter" && me.buffs.warcryUntil > now
            ? " · Warcry"
            : me.buffs.flux
      ? " · Flux"
      : me.buffs.aether
        ? " · Aether"
        : "";

  const gearRows = useMemo(() => {
    const gear: BagRow[] = [];
    for (const i of you.inventory) {
      if (!isMatKind(getItem(i.tokenId)?.kind)) gear.push(i);
    }
    return gear;
  }, [you.inventory]);

  return (
    <div className="cmd-panel equip-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-kicker">Character</div>
          <div className="cmd-panel-title">{you.name}</div>
          <div className="cmd-panel-sub">
            Lv.{you.level} {jobName}
            {sub ? ` / ${JOBS[sub]?.name ?? sub} L${you.subLevel || Math.floor(you.level / 2)}` : ""}
            {stanceLabel}
          </div>
        </div>
        <button type="button" onClick={onClose} className="cmd-close-btn">
          Close
        </button>
      </div>

      <div className="equip-columns">
        <div className="equip-col">
          <Row label="HP" value={`${me.hp} / ${me.maxHp}`} />
          <Row label="MP" value={`${me.mp} / ${me.maxMp}`} />
          <Row label="TP" value={`${tpPct}%`} />
          <Row label="Dust" value={String(you.dust)} />
          <Row label="XP" value={`${xpHave} / ${xpNeed}`} hint={`${xpLeft} to next`} />

          <div className="cmd-section-label">
            Attributes
            {freeLeft > 0 && (
              <span className="equip-free-hint">{freeLeft} free pt{freeLeft === 1 ? "" : "s"}</span>
            )}
          </div>
          {STAT_ORDER.map(([label, key]) => {
            const bonus = freeStats[key] ?? 0;
            return (
              <StatRow
                key={key}
                label={label}
                tip={statTooltip(job, key)}
                value={stats[key]}
                freeBonus={bonus}
                canInc={freeLeft > 0}
                canDec={bonus > 0}
                onInc={() => send({ type: "skill/freestat", attr: key as AttrKey, delta: 1 })}
                onDec={() => send({ type: "skill/freestat", attr: key as AttrKey, delta: -1 })}
              />
            );
          })}

          <div className="cmd-section-label">Combat</div>
          <Row
            label="Attack"
            value={String(attack)}
            hint={
              job === "time_mage"
                ? me.buffs.flux
                  ? "MND (Flux)"
                  : me.buffs.aether
                    ? "Suppressed (Aether)"
                    : "STR ×0.1"
                : job === "sorcerer" || job === "cleric"
                  ? "STR + staff"
                  : "STR + weapon"
            }
          />
          <Row
            label="Defense"
            value={String(defense)}
            hint={
              bodyBonus
                ? job === "knight"
                  ? "+mail"
                  : job === "rogue"
                    ? "+leather"
                    : job === "fighter"
                      ? "+harness"
                      : "+robe"
                : undefined
            }
          />
        </div>

        <div className="equip-block">
          <div className="equip-col">
            <div className="cmd-section-label">Equipment</div>
            <div className="equip-bag-list">
              {gearRows.length === 0 && <div className="craft-empty">No gear or consumables</div>}
              {gearRows.map((i) => (
                <BagItemRow key={i.tokenId} item={i} you={you} showActions />
              ))}
            </div>
          </div>

          <div className="equip-col">
            <div className="cmd-section-label">Paperdoll</div>
            <div className="equip-grid">
              {SLOTS.map((slot) => (
                <EquipCell key={slot.id} slot={slot} you={you} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BagItemRow({
  item,
  you,
  showActions,
}: {
  item: BagRow;
  you: SnapshotMessage["you"];
  showActions: boolean;
}) {
  const def = getItem(item.tokenId);
  const statsLine = formatPrimaryEffects(def?.stats, def?.consume?.hp);
  const jobsLine = formatJobs(def?.jobRestrict);
  const ilevel = def?.craftLevel;
  const actions = showActions ? bagItemActions(item.tokenId, you) : null;
  const equipped =
    you.equip.main === item.tokenId || you.equip.body === item.tokenId;

  return (
    <div className={`equip-bag-card${equipped ? " equipped" : ""}`}>
      <img
        src={itemIcon(item.tokenId)}
        alt=""
        width={48}
        height={48}
        className="equip-item-icon"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
        }}
      />
      <div className="equip-bag-card-body">
        <div className="equip-item-name">
          {itemName(item.tokenId)}
          <span className="equip-item-qty"> ×{item.amount}</span>
        </div>
        {statsLine ? <div className="equip-item-stats">{statsLine}</div> : null}
        {(ilevel != null || jobsLine) && (
          <div className="equip-item-meta">
            {ilevel != null && <span className="equip-item-ilevel">iLv. {ilevel}</span>}
            {jobsLine ? <span className="equip-item-jobs">{jobsLine}</span> : null}
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}

function bagItemActions(tokenId: number, you: SnapshotMessage["you"]) {
  const toggleEquip = (slot: "main" | "body", id: number) => {
    const equipped = you.equip[slot] === id;
    send({ type: "equip", slot, tokenId: equipped ? null : id });
  };

  const btns: { key: string; label: string; onClick: () => void }[] = [];
  if (tokenId === ITEM.STAFF_ASHBEAM) {
    btns.push({
      key: "staff",
      label: you.equip.main === ITEM.STAFF_ASHBEAM ? "Unequip" : "Equip",
      onClick: () => toggleEquip("main", ITEM.STAFF_ASHBEAM),
    });
  }
  if (tokenId === ITEM.ROBE_LINEN) {
    btns.push({
      key: "robe",
      label: you.equip.body === ITEM.ROBE_LINEN ? "Unequip" : "Equip",
      onClick: () => toggleEquip("body", ITEM.ROBE_LINEN),
    });
  }
  if (tokenId === ITEM.SWORD_IRON) {
    btns.push({
      key: "sword",
      label: you.equip.main === ITEM.SWORD_IRON ? "Unequip" : "Equip",
      onClick: () => toggleEquip("main", ITEM.SWORD_IRON),
    });
  }
  if (tokenId === ITEM.MAIL_IRON) {
    btns.push({
      key: "mail",
      label: you.equip.body === ITEM.MAIL_IRON ? "Unequip" : "Equip",
      onClick: () => toggleEquip("body", ITEM.MAIL_IRON),
    });
  }
  if (tokenId === ITEM.DAGGER_IRON) {
    btns.push({
      key: "dagger",
      label: you.equip.main === ITEM.DAGGER_IRON ? "Unequip" : "Equip",
      onClick: () => toggleEquip("main", ITEM.DAGGER_IRON),
    });
  }
  if (tokenId === ITEM.LEATHER_VEST) {
    btns.push({
      key: "vest",
      label: you.equip.body === ITEM.LEATHER_VEST ? "Unequip" : "Equip",
      onClick: () => toggleEquip("body", ITEM.LEATHER_VEST),
    });
  }
  if (tokenId === ITEM.GREATSWORD_IRON) {
    btns.push({
      key: "gs",
      label: you.equip.main === ITEM.GREATSWORD_IRON ? "Unequip" : "Equip",
      onClick: () => toggleEquip("main", ITEM.GREATSWORD_IRON),
    });
  }
  if (tokenId === ITEM.SCALE_HARNESS) {
    btns.push({
      key: "harness",
      label: you.equip.body === ITEM.SCALE_HARNESS ? "Unequip" : "Equip",
      onClick: () => toggleEquip("body", ITEM.SCALE_HARNESS),
    });
  }
  if (tokenId === ITEM.POTION) {
    btns.push({
      key: "potion",
      label: "Use",
      onClick: () => send({ type: "item/use", tokenId: ITEM.POTION }),
    });
  }
  if (!btns.length) return null;
  return (
    <div className="equip-bag-card-actions">
      {btns.map((b) => (
        <button key={b.key} type="button" className="cmd-mini-btn" onClick={b.onClick}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

function StatRow({
  label,
  tip,
  value,
  freeBonus,
  canInc,
  canDec,
  onInc,
  onDec,
}: {
  label: string;
  tip: string;
  value: number;
  freeBonus: number;
  canInc: boolean;
  canDec: boolean;
  onInc: () => void;
  onDec: () => void;
}) {
  const tipId = `stat-tip-${label}`;
  return (
    <div className="equip-stat-row">
      <button type="button" className="label equip-stat-label" aria-describedby={tipId}>
        {label}
      </button>
      <div id={tipId} className="skill-tip equip-stat-tip" role="tooltip">
        <div className="skill-tip-title">{label}</div>
        <div className="skill-tip-body">{tip}</div>
      </div>
      <span className="value">{value}</span>
      {freeBonus > 0 && <span className="equip-free-bonus">+{freeBonus}</span>}
      <span className="equip-arrow-group">
        <button
          type="button"
          className="equip-arrow-btn"
          style={{ opacity: canInc ? 1 : 0.3 }}
          disabled={!canInc}
          title={canInc ? `Add 1 ${label}` : "No free points"}
          onClick={onInc}
          aria-label={`Increase ${label}`}
        >
          ▲
        </button>
        <button
          type="button"
          className="equip-arrow-btn"
          style={{ opacity: canDec ? 1 : 0.3 }}
          disabled={!canDec}
          title={canDec ? `Remove 1 ${label}` : `No free points on ${label}`}
          onClick={onDec}
          aria-label={`Decrease ${label}`}
        >
          ▼
        </button>
      </span>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="equip-stat-row">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function EquipCell({
  slot,
  you,
}: {
  slot: SlotDef;
  you: SnapshotMessage["you"];
}) {
  const live = slot.live;
  const equipped = live ? you.equip[live] : null;
  const canEquip =
    live &&
    slot.tokenFor != null &&
    you.inventory.some((i) => i.tokenId === slot.tokenFor && i.amount > 0);

  const onClick = () => {
    if (!live || slot.tokenFor == null) return;
    if (equipped) {
      send({ type: "equip", slot: live, tokenId: null });
      return;
    }
    if (canEquip) send({ type: "equip", slot: live, tokenId: slot.tokenFor });
  };

  return (
    <button
      type="button"
      title={
        live
          ? equipped
            ? `${itemName(equipped)} (click to unequip)`
            : canEquip
              ? `Equip ${itemName(slot.tokenFor!)}`
              : `${slot.label} — empty`
          : `${slot.label} — not used yet`
      }
      onClick={onClick}
      disabled={!live}
      className={`equip-cell${live ? " live" : ""}${equipped ? " filled" : ""}`}
      style={{
        opacity: live ? 1 : 0.35,
      }}
    >
      <div className="equip-cell-label">{slot.label}</div>
      <div className="equip-cell-icon">
        {equipped ? (
          <img src={itemIcon(equipped)} alt="" width={28} height={28} className="equip-item-icon" />
        ) : live ? (
          "—"
        ) : (
          ""
        )}
      </div>
    </button>
  );
}

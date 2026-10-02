import {
  JOBS,
  SUBJOB_UNLOCK_LEVEL,
  abilityLabel,
  isAbilityId,
  abilityTooltip,
  abilityMp,
  abilityRecastMs,
  type AbilityId as CombatAbilityId,
  type JobId,
} from "@bellgrave/combat";
import { AbilityIcon } from "./AbilityIcon";
import { send } from "./net";
import { useGame } from "./state";

function hudAbilityTip(id: CombatAbilityId): { title: string; body: string; meta: string } {
  const raw = abilityTooltip(id);
  if (typeof raw === "object" && raw !== null && "title" in raw) {
    return raw;
  }
  const label = abilityLabel(id);
  const metaBits: string[] = [];
  const mp = abilityMp(id);
  const recast = abilityRecastMs(id);
  if (mp > 0) metaBits.push(`MP ${mp}`);
  if (recast > 0) {
    const s = recast / 1000;
    metaBits.push(s >= 60 ? `Recast ${Math.round(s / 60)}m` : `Recast ${s}s`);
  }
  const body = typeof raw === "string" ? raw : label;
  return { title: label, body, meta: metaBits.join(" · ") };
}

function isJobMasterNpc(npcId: string): boolean {
  return npcId === "npc-ph-job-master" || npcId === "npc-job-master" || npcId.includes("job-master");
}

function isTrainerNpc(npcId: string, hasSpells: boolean): boolean {
  return (
    hasSpells ||
    npcId === "npc-ph-chronomancer" ||
    npcId === "npc-chronomancer" ||
    npcId.includes("chronomancer")
  );
}

export function NpcInteractMenu() {
  const dialog = useGame((s) => s.npcDialog);
  const you = useGame((s) => s.snapshot?.you);
  if (!dialog) return null;

  const spells = dialog.spells ?? [];
  const isTrainer = isTrainerNpc(dialog.npcId, Boolean(dialog.spells));
  const isJobMaster = isJobMasterNpc(dialog.npcId) || Boolean(dialog.jobs && !isTrainer);
  const jobs = (dialog.jobs ?? []) as JobId[];
  const canSub = (you?.level ?? 0) >= SUBJOB_UNLOCK_LEVEL;
  const mainJob = you?.job;
  const supportJobs = jobs.filter((j) => j !== mainJob && JOBS[j]?.playable);

  const close = () => useGame.getState().setNpcDialog(null);

  // —— Job Master: bare subjob list (no titles / blurbs / main-job chrome) ——
  if (isJobMaster) {
    return (
      <div className="npc-dialog npc-dialog-world npc-dialog-slim">
        <div className="npc-dialog-card npc-dialog-card-slim">
          <div className="npc-subjob-list">
            {supportJobs.map((job) => {
              const def = JOBS[job];
              const current = you?.subjob === job;
              return (
                <button
                  key={`sub-${job}`}
                  type="button"
                  className={["npc-subjob-btn", current ? "current" : "", !canSub ? "locked" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={current || !canSub}
                  onClick={() => {
                    send({ type: "job/subjob", job });
                    close();
                  }}
                >
                  {def.name}
                </button>
              );
            })}
            {canSub && you?.subjob && (
              <button
                type="button"
                className="npc-subjob-btn npc-subjob-clear"
                onClick={() => {
                  send({ type: "job/subjob", job: null });
                  close();
                }}
              >
                None
              </button>
            )}
          </div>
          <button type="button" className="npc-dialog-x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
      </div>
    );
  }

  // —— Trainer: compact ability cards (icon, name, blurb, Dust) ——
  if (isTrainer) {
    return (
      <div className="npc-dialog npc-dialog-world npc-dialog-slim">
        <div className="npc-dialog-card npc-dialog-card-slim npc-trainer-card-wrap">
          <div className="npc-trainer-dust">{you?.dust ?? 0} Dust</div>
          <div className="npc-trainer-cards">
            {spells.length === 0 && <p className="npc-trainer-empty">Nothing available</p>}
            {spells.map((sp) => {
              const canAfford = (you?.dust ?? 0) >= sp.cost;
              const tip = isAbilityId(sp.id) ? hudAbilityTip(sp.id) : null;
              const aid = isAbilityId(sp.id) ? sp.id : null;
              return (
                <button
                  key={sp.id}
                  type="button"
                  className={["npc-trainer-card", canAfford ? "" : "locked"].filter(Boolean).join(" ")}
                  disabled={!canAfford}
                  title={tip ? `${tip.body}${tip.meta ? `\n${tip.meta}` : ""}` : undefined}
                  onClick={() => send({ type: "spell/buy", id: sp.id })}
                >
                  <span className="npc-trainer-card-icon">
                    {aid ? <AbilityIcon id={aid} /> : <span className="skill-glyph">?</span>}
                  </span>
                  <span className="npc-trainer-card-body">
                    <strong className="npc-trainer-card-name">{sp.label}</strong>
                    {tip && <span className="npc-trainer-card-desc">{tip.body}</span>}
                    <span className="npc-trainer-card-cost">{sp.cost} Dust</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" className="npc-dialog-x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
      </div>
    );
  }

  // —— Generic hub NPC dialog (guide / quest / craft / vendor) ——
  return (
    <div className="npc-dialog npc-dialog-world">
      <div className="npc-dialog-card">
        <h2>{dialog.title}</h2>
        <p>{dialog.body}</p>
        {dialog.craftOpen && (
          <button
            type="button"
            className="boot-primary"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("bellgrave:toggle-craft"));
              close();
            }}
          >
            Open Crafting
          </button>
        )}
        <button type="button" className="boot-primary" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}

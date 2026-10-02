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

export function NpcInteractMenu() {
  const dialog = useGame((s) => s.npcDialog);
  const you = useGame((s) => s.snapshot?.you);
  if (!dialog) return null;

  const isTrainer = Boolean(dialog.spells) || dialog.npcId === "npc-ph-chronomancer" || dialog.npcId === "npc-chronomancer";
  const jobs = (dialog.jobs ?? []) as JobId[];
  const spells = dialog.spells ?? [];
  // Support job from L10 through max — use live level so Max Lv refreshes an open dialog
  const canSub = (you?.level ?? 0) >= SUBJOB_UNLOCK_LEVEL;
  const subMode = Boolean(dialog.subjobMode) || (canSub && dialog.npcId === "npc-job-master");
  const mainJob = you?.job;
  const supportJobs = jobs.filter((j) => j !== mainJob);
  const subLevel = dialog.subLevel ?? Math.max(1, Math.floor((you?.level ?? 1) / 2));

  return (
    <div className="npc-dialog npc-dialog-world">
      <div className="npc-dialog-card">
        <h2>{subMode ? "Job Master — Support Job" : dialog.title}</h2>
        <p>
          {subMode
            ? `Main: ${you ? JOBS[you.job]?.name ?? you.job : "—"} L${you?.level ?? "?"}. Pick a support job (effective L${subLevel}). Sprite stays your main.`
            : dialog.body}
        </p>
        {!isTrainer && (
          <>
            <p className="npc-dialog-current">
              Main: {you ? JOBS[you.job]?.name ?? you.job : "—"}
              {you?.subjob
                ? ` · Support: ${JOBS[you.subjob]?.name ?? you.subjob} L${you.subLevel}`
                : canSub
                  ? " · Support: none"
                  : ""}
            </p>
            {subMode && (
              <>
                <p className="npc-dialog-current" style={{ marginBottom: 6 }}>
                  Support job (L{subLevel})
                </p>
                <div className="npc-job-list">
                  {supportJobs.map((job) => {
                    const def = JOBS[job];
                    const current = you?.subjob === job;
                    return (
                      <button
                        key={`sub-${job}`}
                        type="button"
                        className={["npc-job-btn", def.playable ? "" : "locked", current ? "current" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={!def.playable || current}
                        onClick={() => {
                          send({ type: "job/subjob", job });
                          useGame.getState().setNpcDialog(null);
                        }}
                      >
                        <strong>{def.name}</strong>
                        <span>{def.blurb}</span>
                        {!def.playable && <em>Coming soon</em>}
                        {current && <em>Selected</em>}
                      </button>
                    );
                  })}
                </div>
                {you?.subjob && (
                  <button
                    type="button"
                    className="npc-dialog-close"
                    onClick={() => {
                      send({ type: "job/subjob", job: null });
                      useGame.getState().setNpcDialog(null);
                    }}
                  >
                    Clear support job
                  </button>
                )}
                <p className="npc-dialog-current" style={{ marginTop: 12, marginBottom: 6 }}>
                  Change main job (keeps all skill-tree nodes)
                </p>
              </>
            )}
            <div className="npc-job-list">
              {jobs.map((job) => {
                const def = JOBS[job];
                const current = you?.job === job;
                return (
                  <button
                    key={`main-${job}`}
                    type="button"
                    className={["npc-job-btn", def.playable ? "" : "locked", current ? "current" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!def.playable || current}
                    onClick={() => {
                      send({ type: "job/change", job });
                      useGame.getState().setNpcDialog(null);
                    }}
                  >
                    <strong>{def.name}</strong>
                    <span>{def.blurb}</span>
                    {!def.playable && <em>Coming soon</em>}
                    {current && <em>Current main</em>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {isTrainer && (
          <>
            <p className="npc-dialog-current">Dust: {you?.dust ?? 0}</p>
            <div className="npc-job-list">
              {spells.length === 0 && (
                <p className="spellbook-empty">No new scrolls available at your level.</p>
              )}
              {spells.map((sp) => {
                const canAfford = (you?.dust ?? 0) >= sp.cost;
                const tip = isAbilityId(sp.id) ? hudAbilityTip(sp.id) : null;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    className={["npc-job-btn", canAfford ? "" : "locked"].filter(Boolean).join(" ")}
                    disabled={!canAfford}
                    title={tip ? `${tip.body}\n${tip.meta}` : undefined}
                    onClick={() => send({ type: "spell/buy", id: sp.id })}
                  >
                    <strong>
                      {sp.label}{" "}
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        Lv{sp.unlockLevel}
                        {"track" in sp && sp.track ? ` - ${sp.track === "main" ? "Main" : "Support"}` : ""}
                      </span>
                    </strong>
                    {tip && <span className="npc-spell-blurb">{tip.body}</span>}
                    <span>{sp.cost} Dust</span>
                    {!canAfford && <em>Need more Dust</em>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {dialog.craftOpen && (
          <button
            type="button"
            className="boot-primary"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("bellgrave:toggle-craft"));
              useGame.getState().setNpcDialog(null);
            }}
          >
            Open Crafting
          </button>
        )}
        <button type="button" className="boot-primary" onClick={() => useGame.getState().setNpcDialog(null)}>
          Close
        </button>
      </div>
    </div>
  );
}

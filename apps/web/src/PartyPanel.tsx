import type { PartyInviteSnapshot, PartySnapshot } from "@bellgrave/protocol";
import { send } from "./net";
import { useGame } from "./state";

type Props = {
  party: PartySnapshot | null;
  invite: PartyInviteSnapshot | null;
  selectedTarget: string | null;
  myWallet: string;
  onClose: () => void;
};

export function PartyPanel({ party, invite, selectedTarget, myWallet, onClose }: Props) {
  const snap = useGame((s) => s.snapshot);
  const me = myWallet.toLowerCase();
  const isLeader = !!party && party.leaderId.toLowerCase() === me;

  const nearbyPlayers =
    snap?.units.filter(
      (u) =>
        u.kind === "player" &&
        u.id.toLowerCase() !== me &&
        (!party || !party.members.some((m) => m.id.toLowerCase() === u.id.toLowerCase())),
    ) ?? [];

  const selectedPlayer = nearbyPlayers.find((u) => u.id === selectedTarget) ?? null;

  return (
    <div className="cmd-panel party-panel" role="dialog" aria-label="Party">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-kicker">Group</div>
          <div className="cmd-panel-title">Party</div>
          <div className="cmd-panel-sub">
            Up to 10 others · shared heals, buffs &amp; combat
          </div>
        </div>
        <button type="button" className="cmd-close-btn" onClick={onClose}>
          Close
        </button>
      </div>

      {invite && (
        <div className="party-invite-banner settings-card">
          <div className="party-invite-text">
            <strong>{invite.fromName}</strong> invited you to a party.
          </div>
          <div className="party-invite-actions">
            <button
              type="button"
              className="hud-cmd-btn selected"
              onClick={() => send({ type: "party/accept" })}
            >
              Accept
            </button>
            <button
              type="button"
              className="hud-cmd-btn"
              onClick={() => send({ type: "party/decline" })}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {!party ? (
        <div className="settings-card party-solo">
          <div className="cmd-section-label">Not in a party</div>
          <p className="party-hint">
            Select another player in the world, or pick someone nearby, then invite.
          </p>
          {selectedPlayer && (
            <button
              type="button"
              className="hud-cmd-btn selected"
              onClick={() => send({ type: "party/invite", targetId: selectedPlayer.id })}
            >
              Invite {selectedPlayer.name}
            </button>
          )}
          <div className="party-nearby-list">
            {nearbyPlayers.length === 0 && (
              <div className="party-hint">No other players nearby in your view.</div>
            )}
            {nearbyPlayers.map((u) => (
              <button
                key={u.id}
                type="button"
                className="party-member-row"
                onClick={() => send({ type: "party/invite", targetId: u.id })}
              >
                <span className="party-member-name">{u.name}</span>
                <span className="party-member-meta">
                  Invite · Invite
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="settings-card">
          <div className="cmd-section-label">
            Members ({party.members.length}/11)
          </div>
          <div className="party-member-list">
            {party.members.map((m) => {
              const leader = m.id.toLowerCase() === party.leaderId.toLowerCase();
              const self = m.id.toLowerCase() === me;
              const hpPct = m.maxHp > 0 ? Math.round((100 * m.hp) / m.maxHp) : 0;
              return (
                <div key={m.id} className="party-member-row static">
                  <div className="party-member-main">
                    <span className="party-member-name">
                      {m.name}
                      {leader ? " ★" : ""}
                      {self ? " (you)" : ""}
                    </span>
                    <span className="party-member-meta">
                      L{m.level} · {m.job.replace(/_/g, " ")}
                      {!m.online ? " · offline" : ""}
                    </span>
                    <div className="party-hp-track" aria-hidden>
                      <div className="party-hp-fill" style={{ width: `${hpPct}%` }} />
                    </div>
                  </div>
                  {isLeader && !self && (
                    <button
                      type="button"
                      className="party-kick-btn"
                      title={`Kick ${m.name}`}
                      onClick={() => send({ type: "party/kick", targetId: m.id })}
                    >
                      Kick
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isLeader && (
            <div className="party-invite-block">
              <div className="cmd-section-label">Invite</div>
              {selectedPlayer ? (
                <button
                  type="button"
                  className="hud-cmd-btn selected"
                  onClick={() => send({ type: "party/invite", targetId: selectedPlayer.id })}
                >
                  Invite selected: {selectedPlayer.name}
                </button>
              ) : (
                <div className="party-hint">Click another player in the world to select them.</div>
              )}
              {nearbyPlayers.slice(0, 8).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="party-member-row"
                  onClick={() => send({ type: "party/invite", targetId: u.id })}
                >
                  <span className="party-member-name">{u.name}</span>
                  <span className="party-member-meta">Invite</span>
                </button>
              ))}
            </div>
          )}

          <div className="party-footer-actions">
            <button type="button" className="hud-cmd-btn" onClick={() => send({ type: "party/leave" })}>
              Leave
            </button>
            {isLeader && (
              <button
                type="button"
                className="hud-cmd-btn hud-cmd-status"
                onClick={() => send({ type: "party/disband" })}
              >
                Disband
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

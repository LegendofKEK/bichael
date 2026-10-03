import type { LokEventView, LokExploreScope } from "@bellgrave/protocol";
import { useEffect, useRef, useState } from "react";
import { send } from "./net";
import { useGame } from "./state";

type Props = { onClose: () => void };

export function ExplorerPanel({ onClose }: Props) {
  const explorer = useGame((s) => s.explorer);
  const [scope, setScope] = useState<LokExploreScope>("yours");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<LokEventView[]>([]);
  const [meta, setMeta] = useState<{ total: number; hasMore: boolean } | null>(null);
  const reqRef = useRef(0);
  const [activeReq, setActiveReq] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setRows([]);
    setMeta(null);
    const req = reqRef.current + 1;
    reqRef.current = req;
    setActiveReq(req);
    send({ type: "lok/explore", scope, q: debounced, req });
  }, [scope, debounced]);

  useEffect(() => {
    if (!explorer || explorer.req !== activeReq) return;
    setMeta({ total: explorer.total, hasMore: explorer.hasMore });
    if (explorer.beforeSeq != null) {
      setRows((prev) => {
        const seen = new Set(prev.map((event) => event.seq + ":" + event.hash));
        const more = explorer.events.filter((event) => !seen.has(event.seq + ":" + event.hash));
        return [...prev, ...more];
      });
      return;
    }
    setRows(explorer.events);
  }, [explorer, activeReq]);

  const empty = !meta
    ? "Reading the log…"
    : rows.length > 0
      ? ""
      : debounced
        ? "No events match."
        : scope === "yours"
          ? "Nothing on your log yet."
          : "The world log is empty.";

  const older = () => {
    const tail = rows[rows.length - 1];
    if (!tail) return;
    const req = reqRef.current + 1;
    reqRef.current = req;
    setActiveReq(req);
    send({ type: "lok/explore", scope, q: debounced, beforeSeq: tail.seq, req });
  };

  const refresh = () => {
    const req = reqRef.current + 1;
    reqRef.current = req;
    setActiveReq(req);
    send({ type: "lok/explore", scope, q: debounced, req });
  };

  return (
    <div className="cmd-panel explorer-panel" role="dialog" aria-label="Explorer">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-kicker">Log</div>
          <div className="cmd-panel-title">Explorer</div>
          <div className="cmd-panel-sub">
            {scope === "yours" ? "Your character" : "Everyone"}
            {meta ? ` · ${meta.total}` : ""}
          </div>
        </div>
        <button type="button" className="cmd-close-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="lok-row">
        <button
          type="button"
          className={`cmd-pill-tab${scope === "yours" ? " on" : ""}`}
          onClick={() => setScope("yours")}
        >
          Yours
        </button>
        <button
          type="button"
          className={`cmd-pill-tab${scope === "everyone" ? " on" : ""}`}
          onClick={() => setScope("everyone")}
        >
          Everyone
        </button>
        <button type="button" className="hud-cmd-btn" onClick={refresh}>
          Refresh
        </button>
      </div>

      <div className="lok-row">
        <input
          value={q}
          placeholder="Kind, name, item, ability, amount"
          aria-label="Search events"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {empty ? (
        <p className="lok-note">{empty}</p>
      ) : (
        <div className="party-member-list">
          {rows.map((event) => (
            <div key={event.seq + ":" + event.hash} className="party-member-row static">
              <div className="party-member-main">
                <span className="party-member-name">{event.text}</span>
                <span className="party-member-meta">
                  {event.kind}
                  {event.character ? ` · ${event.character}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta?.hasMore && rows.length > 0 && (
        <div className="party-footer-actions">
          <button type="button" className="hud-cmd-btn" onClick={older}>
            Older
          </button>
        </div>
      )}
    </div>
  );
}

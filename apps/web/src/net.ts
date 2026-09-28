import type { ClientMessage, ServerMessage } from "@bellgrave/protocol";
import { useGame } from "./state";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8787";
const HEARTBEAT_MS = 20_000;
const RESUME_KEY = "bellgrave.resumeChar";

let socket: WebSocket | null = null;
let authedWallet: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
/** Character to re-enter after a soft disconnect while in play. */
let resumeCharId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityBound = false;
/** User chose Logout — drop the live session and do not auto-enter the character. */
let intentionalLogout = false;

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "ping", t: Date.now() } satisfies ClientMessage));
  }, HEARTBEAT_MS);
}

function rememberResume() {
  if (intentionalLogout) return;
  const g = useGame.getState();
  if (g.phase === "play" && g.selectedCharId) {
    resumeCharId = g.selectedCharId;
    try {
      localStorage.setItem(RESUME_KEY, g.selectedCharId);
    } catch {
      /* ignore */
    }
  }
}

function consumeResumeId(rosterIds: string[]): string | null {
  const stored = resumeCharId ?? (() => {
    try {
      return localStorage.getItem(RESUME_KEY);
    } catch {
      return null;
    }
  })();
  resumeCharId = null;
  if (!stored) return null;
  if (!rosterIds.includes(stored)) return null;
  return stored;
}

function clearResumeStorage() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}

function tryAutoAuth() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const w = mockWallet();
  if (authedWallet === w.toLowerCase() && useGame.getState().wallet) return;
  authedWallet = w.toLowerCase();
  useGame.getState().setWallet(w);
  socket.send(JSON.stringify({ type: "auth", wallet: w } satisfies ClientMessage));
}

function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    // Tab back: ensure socket is alive and nudge the server.
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      connectSocket();
      return;
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "ping", t: Date.now() } satisfies ClientMessage));
    }
  });
}

export function connectSocket() {
  bindVisibility();
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  rememberResume();
  socket = new WebSocket(WS_URL);
  socket.addEventListener("open", () => {
    useGame.getState().setConnected(true);
    useGame.getState().pushLog("Connected to Bellgrave server.");
    startHeartbeat();
    tryAutoAuth();
  });
  socket.addEventListener("close", () => {
    clearHeartbeat();
    useGame.getState().setConnected(false);
    authedWallet = null;
    const wasLogout = intentionalLogout;
    intentionalLogout = false;
    if (!wasLogout) rememberResume();
    useGame.getState().pushLog(wasLogout ? "Logged out." : "Disconnected. Reconnecting…");
    reconnectTimer = setTimeout(connectSocket, wasLogout ? 0 : 1200);
  });
  socket.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data)) as ServerMessage;
    const g = useGame.getState();
    if (msg.type === "pong") {
      return;
    }
    if (msg.type === "auth/ok") {
      g.setWallet(msg.wallet);
      g.setPendingCreateEnter(false);
      const list =
        msg.characters?.length > 0
          ? msg.characters
          : msg.character
            ? [msg.character]
            : [];
      g.setCharacters(list);
      g.setHasCharacter(list.length > 0 || msg.hasCharacter);
      const primary = msg.character ?? list[0] ?? null;
      g.setCharacterPreview(primary);

      const resumeId = consumeResumeId(list.map((c) => c.id));
      if (resumeId) {
        // Soft reconnect while AFK / tab-sleep: drop back into the same character.
        g.setSelectedCharId(resumeId);
        g.setPhase("play");
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ type: "char/enter", characterId: resumeId } satisfies ClientMessage),
          );
        }
        return;
      }

      clearResumeStorage();
      g.clearSnapshot();
      g.setSelectedCharId(primary?.id ?? null);
      // Land on select or create — never skip straight into the world from a fresh auth.
      g.setPhase(list.length > 0 || msg.hasCharacter ? "select" : "create");
    } else if (msg.type === "snapshot") {
      g.setSnapshot(msg);
      // Persist resume target while playing so a later drop can recover.
      if (!intentionalLogout && g.phase === "play" && msg.you.characterId) {
        try {
          localStorage.setItem(RESUME_KEY, msg.you.characterId);
        } catch {
          /* ignore */
        }
      }
      // Play: only apply world state — avoid roster churn every 50ms tick.
      if (g.phase === "play") {
        if (g.pendingCreateEnter) {
          g.setPendingCreateEnter(false);
        }
        return;
      }
      const preview = {
        id: msg.you.characterId,
        name: msg.you.name,
        job: msg.you.job,
        level: msg.you.level,
        gender: msg.you.gender ?? "male",
      };
      g.setCharacterPreview(preview);
      g.setSelectedCharId(preview.id);
      g.setHasCharacter(true);
      const others = g.characters.filter((c) => c.id !== preview.id);
      g.setCharacters([...others, preview]);
      if (g.pendingCreateEnter) {
        g.setPendingCreateEnter(false);
        g.setPhase("play");
      }
    } else if (msg.type === "log") {
      g.pushLog(msg.message);
    } else if (msg.type === "error") {
      g.pushLog(`Error: ${msg.message}`);
    } else if (msg.type === "party/invite") {
      g.pushLog(`${msg.fromName} invited you to a party � open Party to accept.`);
    } else if (msg.type === "npc/dialog") {
      g.setNpcDialog({
        npcId: msg.npcId,
        title: msg.title,
        body: msg.body,
        jobs: msg.jobs,
        spells: msg.spells,
        subjobMode: msg.subjobMode,
        subLevel: msg.subLevel,
        craftOpen: msg.craftOpen,
      });
    }
  });
  return socket;
}

/**
 * Leave the world: close the socket so the server parks the character,
 * forget the resume target, then reconnect onto character select (or create).
 */
export function logoutToMenu() {
  if (intentionalLogout) return;
  intentionalLogout = true;
  resumeCharId = null;
  clearResumeStorage();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const g = useGame.getState();
  g.setPendingCreateEnter(false);
  g.setNpcDialog(null);
  g.clearSnapshot();
  g.setPhase(g.characters.length > 0 || g.hasCharacter ? "select" : "create");

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    socket.close();
    return;
  }
  intentionalLogout = false;
  connectSocket();
}

export function send(msg: ClientMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    useGame.getState().pushLog("Not connected.");
    // Kick a reconnect if the socket died quietly.
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      connectSocket();
    }
    return;
  }
  socket.send(JSON.stringify(msg));
}

export function mockWallet(): string {
  const existing = localStorage.getItem("bellgrave.wallet");
  if (existing) return existing;
  const id = `0xmvp${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  localStorage.setItem("bellgrave.wallet", id);
  return id;
}

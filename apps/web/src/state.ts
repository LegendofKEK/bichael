import type {
  AbilityId,
  CharacterPreview,
  JobId,
  SnapshotMessage,
  SpellOffer,
  UnitSnapshot,
} from "@bellgrave/protocol";
import { create } from "zustand";

type Phase = "boot" | "auth" | "create" | "select" | "play";

export type NpcDialog = {
  npcId: string;
  title: string;
  body: string;
  jobs?: JobId[];
  spells?: SpellOffer[];
  subjobMode?: boolean;
  subLevel?: number;
  craftOpen?: boolean;
};

type GameState = {
  phase: Phase;
  wallet: string | null;
  connected: boolean;
  hasCharacter: boolean;
  characters: CharacterPreview[];
  selectedCharId: string | null;
  characterPreview: CharacterPreview | null;
  /** True after submitting char/create — next matching snapshot may enter play. */
  pendingCreateEnter: boolean;
  snapshot: SnapshotMessage | null;
  logs: string[];
  selectedTarget: string | null;
  npcDialog: NpcDialog | null;
  setPhase: (p: Phase) => void;
  setWallet: (w: string | null) => void;
  setConnected: (c: boolean) => void;
  setHasCharacter: (h: boolean) => void;
  setCharacters: (c: CharacterPreview[]) => void;
  setSelectedCharId: (id: string | null) => void;
  setCharacterPreview: (c: GameState["characterPreview"]) => void;
  setPendingCreateEnter: (v: boolean) => void;
  setSnapshot: (s: SnapshotMessage) => void;
  clearSnapshot: () => void;
  pushLog: (m: string) => void;
  setSelectedTarget: (id: string | null) => void;
  setNpcDialog: (d: NpcDialog | null) => void;
  me: () => UnitSnapshot | null;
};

export const useGame = create<GameState>((set, get) => ({
  phase: "boot",
  wallet: null,
  connected: false,
  hasCharacter: false,
  characters: [],
  selectedCharId: null,
  characterPreview: null,
  pendingCreateEnter: false,
  snapshot: null,
  logs: [],
  selectedTarget: null,
  npcDialog: null,
  setPhase: (phase) => set({ phase }),
  setWallet: (wallet) => set({ wallet: wallet ? wallet.toLowerCase() : null }),
  setConnected: (connected) => set({ connected }),
  setHasCharacter: (hasCharacter) => set({ hasCharacter }),
  setCharacters: (characters) => set({ characters, hasCharacter: characters.length > 0 }),
  setSelectedCharId: (selectedCharId) => set({ selectedCharId }),
  setCharacterPreview: (characterPreview) => set({ characterPreview }),
  setPendingCreateEnter: (pendingCreateEnter) => set({ pendingCreateEnter }),
  clearSnapshot: () => set({ snapshot: null, selectedTarget: null }),
  setSnapshot: (snapshot) => {
    const prev = get().snapshot;
    // Skip identical-tick no-ops (reconnect / duplicate floods).
    if (prev && prev.tick === snapshot.tick) return;
    const w = get().wallet?.toLowerCase();
    const me = w
      ? snapshot.units.find((u) => u.id.toLowerCase() === w && u.kind === "player")
      : undefined;
    set({
      snapshot,
      logs: snapshot.log ?? prev?.log ?? get().logs,
      selectedTarget: me?.targetId ?? null,
    });
  },
  pushLog: (message) =>
    set((s) => ({ logs: [...s.logs.slice(-30), message] })),
  setSelectedTarget: (selectedTarget) => set({ selectedTarget }),
  setNpcDialog: (npcDialog) => set({ npcDialog }),
  me: () => {
    const s = get().snapshot;
    const w = get().wallet;
    if (!s || !w) return null;
    return s.units.find((u) => u.id.toLowerCase() === w.toLowerCase() && u.kind === "player") ?? null;
  },
}));

export type { AbilityId };

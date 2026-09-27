/**
 * Customizable two-row hotbar (10 + 10). Persists per wallet+main+sub in localStorage.
 * Rest/Potion stay pinned off-bar; spellbook drag assigns slots.
 */
import {
  hotbarOrderDual,
  isAbilityId,
  type AbilityId,
  type JobId,
} from "@bellgrave/combat";

export const HOTBAR_ROW_LEN = 10;
export const HOTBAR_ROWS = 2;
export const HOTBAR_SLOT_COUNT = HOTBAR_ROW_LEN * HOTBAR_ROWS;

export const HOTBAR_DRAG_MIME = "application/x-bellgrave-ability";
export const HOTBAR_SLOT_MIME = "application/x-bellgrave-hotbar-slot";

export type HotbarSlots = (AbilityId | null)[];

function storageKey(wallet: string, job: string, sub: string | null): string {
  return `bellgrave-hotbar-v2:${wallet.toLowerCase()}:${job}:${sub ?? "-"}`;
}

function emptySlots(): HotbarSlots {
  return Array.from({ length: HOTBAR_SLOT_COUNT }, () => null);
}

/** Seed from main + support combat order (excludes Rest — pinned next to Potion). */
export function defaultHotbarSlots(
  job: JobId,
  unlocked: readonly AbilityId[],
  sub: JobId | null = null,
): HotbarSlots {
  const slots = emptySlots();
  const ordered = hotbarOrderDual(job, sub, unlocked).filter((id) => id !== "rest");
  for (let i = 0; i < Math.min(ordered.length, HOTBAR_SLOT_COUNT); i++) {
    slots[i] = ordered[i]!;
  }
  return slots;
}

function sanitize(slots: unknown, unlocked: ReadonlySet<AbilityId>): HotbarSlots | null {
  if (!Array.isArray(slots) || slots.length !== HOTBAR_SLOT_COUNT) return null;
  return slots.map((id) => {
    if (id == null) return null;
    if (typeof id !== "string" || !isAbilityId(id)) return null;
    if (id === "rest") return null;
    if (!unlocked.has(id)) return null;
    return id;
  });
}

export function loadHotbar(
  wallet: string | null,
  job: JobId,
  unlocked: readonly AbilityId[],
  sub: JobId | null = null,
): HotbarSlots {
  const unlockedSet = new Set(unlocked);
  if (!wallet) return defaultHotbarSlots(job, unlocked, sub);
  try {
    const raw = localStorage.getItem(storageKey(wallet, job, sub));
    if (raw) {
      const parsed = sanitize(JSON.parse(raw) as unknown, unlockedSet);
      if (parsed) {
        // Fill empty trailing slots with newly unlocked support abilities.
        const used = new Set(parsed.filter(Boolean) as AbilityId[]);
        const extras = hotbarOrderDual(job, sub, unlocked).filter(
          (id) => id !== "rest" && !used.has(id),
        );
        const next = [...parsed] as HotbarSlots;
        let ei = 0;
        for (let i = 0; i < next.length && ei < extras.length; i++) {
          if (next[i] == null) next[i] = extras[ei++]!;
        }
        return next;
      }
    }
  } catch {
    /* ignore corrupt */
  }
  return defaultHotbarSlots(job, unlocked, sub);
}

export function saveHotbar(
  wallet: string | null,
  job: string,
  slots: HotbarSlots,
  sub: string | null = null,
): void {
  if (!wallet) return;
  try {
    localStorage.setItem(storageKey(wallet, job, sub), JSON.stringify(slots));
  } catch {
    /* quota */
  }
}

export function assignHotbarSlot(slots: HotbarSlots, index: number, id: AbilityId): HotbarSlots {
  if (index < 0 || index >= HOTBAR_SLOT_COUNT) return slots;
  if (id === "rest") return slots;
  const next = [...slots] as HotbarSlots;
  const existing = next.findIndex((s) => s === id);
  if (existing >= 0 && existing !== index) next[existing] = null;
  next[index] = id;
  return next;
}

export function clearHotbarSlot(slots: HotbarSlots, index: number): HotbarSlots {
  if (index < 0 || index >= HOTBAR_SLOT_COUNT) return slots;
  const next = [...slots] as HotbarSlots;
  next[index] = null;
  return next;
}

export function swapHotbarSlots(slots: HotbarSlots, from: number, to: number): HotbarSlots {
  if (from < 0 || from >= HOTBAR_SLOT_COUNT || to < 0 || to >= HOTBAR_SLOT_COUNT) return slots;
  if (from === to) return slots;
  const next = [...slots] as HotbarSlots;
  const a = next[from] ?? null;
  const b = next[to] ?? null;
  next[from] = b;
  next[to] = a;
  return next;
}

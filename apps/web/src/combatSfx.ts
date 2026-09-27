/**
 * One-shot combat SFX. Pools swing wooshes so haste can overlap; TD plays once per wave.
 */
import { JOB_WEAPON, isJobId, type JobId, type JobWeapon } from "@bellgrave/combat";

const SFX_URL = {
  staff: "/audio/staff-woosh.mp3",
  sword: "/audio/sword-woosh.mp3",
  temporal_distortion: "/audio/time-distortion.mp3",
} as const;

type SfxKind = keyof typeof SFX_URL;

const POOL = 4;
const pools = new Map<SfxKind, HTMLAudioElement[]>();
const cursors = new Map<SfxKind, number>();
let unlocked = false;
/** Dedupes AoE TD so six hits don't fire six sounds. */
let lastTdWaveUntil = 0;

function ensurePool(kind: SfxKind): HTMLAudioElement[] {
  let pool = pools.get(kind);
  if (!pool) {
    const n = kind === "temporal_distortion" ? 2 : POOL;
    pool = Array.from({ length: n }, () => {
      const a = new Audio(SFX_URL[kind]);
      a.preload = "auto";
      a.volume = 0.55;
      return a;
    });
    pools.set(kind, pool);
    cursors.set(kind, 0);
  }
  return pool;
}

/** Call from a user gesture path (shares unlock with BGM). */
export function unlockCombatSfx(): void {
  unlocked = true;
  for (const kind of Object.keys(SFX_URL) as SfxKind[]) {
    for (const a of ensurePool(kind)) {
      a.load();
    }
  }
}

function playKind(kind: SfxKind, volume = 0.55): void {
  if (!unlocked) return;
  const pool = ensurePool(kind);
  const i = cursors.get(kind) ?? 0;
  cursors.set(kind, (i + 1) % pool.length);
  const a = pool[i]!;
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, volume));
    void a.play().catch(() => {
      /* autoplay / missing file */
    });
  } catch {
    /* ignore */
  }
}

export function weaponForJob(job: JobId | string | undefined | null): JobWeapon {
  if (job && isJobId(job)) return JOB_WEAPON[job];
  return "staff";
}

/** Player / ally melee swing. */
export function playJobSwing(job: JobId | string | undefined | null, volume?: number): void {
  playKind(weaponForJob(job), volume);
}

/** Enemy sword swing (Petrified Guards, future blade mobs). */
export function playEnemySwing(volume?: number): void {
  playKind("sword", volume ?? 0.5);
}

/**
 * Temporal Distortion impact — once per cast wave (shared animUntil across hits).
 */
export function playTemporalDistortion(impactUntil: number, volume = 0.72): void {
  if (impactUntil <= lastTdWaveUntil) return;
  lastTdWaveUntil = impactUntil;
  playKind("temporal_distortion", volume);
}

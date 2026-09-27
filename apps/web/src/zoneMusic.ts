/**
 * Zone BGM — loops the active track.
 * Entering a zone with the same (or no) music keeps playback; a different URL crossfades/switches.
 */
let audio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let unlocked = false;
let pendingTrack: string | null = null;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.45;
  }
  return audio;
}

async function playTrack(url: string): Promise<void> {
  const el = ensureAudio();
  if (currentTrack === url && !el.paused) return;

  const sameSrc = currentTrack === url;
  currentTrack = url;
  if (!sameSrc) {
    el.src = url;
    el.loop = true;
    el.load();
  }
  try {
    await el.play();
    unlocked = true;
    pendingTrack = null;
  } catch {
    // Autoplay blocked until a user gesture — retry on next unlock.
    pendingTrack = url;
  }
}

/** Call from a click/key path so browsers allow audio. */
export function unlockZoneMusic(): void {
  unlocked = true;
  if (pendingTrack) {
    void playTrack(pendingTrack);
  } else if (currentTrack && audio?.paused) {
    void audio.play().catch(() => {
      /* ignore */
    });
  }
}

/**
 * Apply zone music policy:
 * - `undefined` / omit → do nothing (keep current song)
 * - same URL → keep playing (do not restart)
 * - new URL → switch and loop
 */
export function setZoneMusic(trackUrl: string | undefined | null): void {
  if (trackUrl == null || trackUrl === "") return;
  void playTrack(trackUrl);
}

/** Enter a zone by id from config `ZONES`. */
export function enterZoneMusic(musicUrl: string | undefined): void {
  setZoneMusic(musicUrl);
}

export function stopZoneMusic(): void {
  pendingTrack = null;
  currentTrack = null;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
}

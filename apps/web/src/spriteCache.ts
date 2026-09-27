import * as THREE from "three";
import { applyMagentaChroma } from "./chroma";

/**
 * Shared on-demand sprite textures. Billboards request only the URL they need
 * instead of Suspense-loading every idle/walk/action frame for the job.
 */
const cache = new Map<string, THREE.Texture>();
const inflight = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();
type LoadListener = (url: string, tex: THREE.Texture) => void;
const listeners = new Set<LoadListener>();

export function subscribeSpriteLoads(fn: LoadListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function peekSpriteTexture(url: string): THREE.Texture | undefined {
  return cache.get(url);
}

/** Return cached texture, or start a background load and return undefined. */
export function requestSpriteTexture(url: string): THREE.Texture | undefined {
  const hit = cache.get(url);
  if (hit) return hit;

  if (!inflight.has(url)) {
    const p = loader
      .loadAsync(url)
      .then((tex) => {
        const keyed = applyMagentaChroma(tex);
        cache.set(url, keyed);
        inflight.delete(url);
        for (const fn of listeners) fn(url, keyed);
        return keyed;
      })
      .catch(() => {
        inflight.delete(url);
      });
    inflight.set(url, p as Promise<THREE.Texture>);
  }
  return undefined;
}

/** Synchronously register an already-loaded texture (e.g. Suspense seed). */
export function putSpriteTexture(url: string, tex: THREE.Texture): THREE.Texture {
  const existing = cache.get(url);
  if (existing) return existing;
  const keyed = applyMagentaChroma(tex);
  cache.set(url, keyed);
  return keyed;
}

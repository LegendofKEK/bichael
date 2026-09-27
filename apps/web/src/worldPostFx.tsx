/**
 * Subtle screen-space post FX for Bellgrave world Canvas.
 * Tune / flip `enabled` flags below — keep Bloom threshold high so only bright FX bloom.
 */
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { ReactElement } from "react";

/** Easy kill-switch + knobs — change here, not scattered through the scene. */
export const WORLD_POST_FX = {
  /** Master toggle — full-screen composer is a steady FPS tax; keep off for realtime. */
  enabled: false,
  /** MSAA samples for the composer (0 = cheapest; Canvas already uses antialias:false). */
  multisampling: 0,
  bloom: {
    /** Bloom+mipmapBlur is a full-screen tax; keep off for realtime. Vignette stays. */
    enabled: false,
    /** Soft glow — keep low so the world does not wash out. */
    intensity: 0.22,
    /** Only near-white / additive FX pass; terrain and sprites stay clean. */
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.2,
    mipmapBlur: false,
  },
  vignette: {
    enabled: true,
    offset: 0.32,
    darkness: 0.38,
  },
} as const;

export function WorldPostFx() {
  if (!WORLD_POST_FX.enabled) return null;

  const { bloom, vignette, multisampling } = WORLD_POST_FX;
  const children: ReactElement[] = [];
  if (bloom.enabled) {
    children.push(
      <Bloom
        key="bloom"
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur={bloom.mipmapBlur}
      />,
    );
  }
  if (vignette.enabled) {
    children.push(
      <Vignette
        key="vignette"
        eskil={false}
        offset={vignette.offset}
        darkness={vignette.darkness}
      />,
    );
  }
  if (children.length === 0) return null;

  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      {children}
    </EffectComposer>
  );
}

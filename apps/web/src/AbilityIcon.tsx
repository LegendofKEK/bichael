import {
  abilityGlyph,
  abilityIconUrl,
  isBattleMageAbilityId,
  isClericAbilityId,
  isFighterAbilityId,
  isKnightAbilityId,
  isRogueAbilityId,
  isSorcererAbilityId,
  isTimAbilityId,
  isWeaponTpAbilityId,
  type AbilityId,
} from "@bellgrave/combat";
import { useEffect, useState, type CSSProperties } from "react";
import { chromaKeyIconUrl } from "./chroma";

type Props = {
  id: AbilityId | "potion";
  className?: string;
  style?: CSSProperties;
  preferIcon?: boolean;
};

function glyphFor(id: AbilityId | "potion"): string {
  if (id === "potion") return "Pt";
  if (
    isTimAbilityId(id) ||
    isKnightAbilityId(id) ||
    isRogueAbilityId(id) ||
    isFighterAbilityId(id) ||
    isClericAbilityId(id) ||
    isSorcererAbilityId(id) ||
    isBattleMageAbilityId(id) ||
    isWeaponTpAbilityId(id)
  ) {
    return abilityGlyph(id);
  }
  return "?";
}

/**
 * Ability icon — knocks magenta/hot-pink to transparent at display time
 * so chroma-key backgrounds never show in the HUD (source PNGs unchanged).
 */
export function AbilityIcon({ id, className = "", style, preferIcon = true }: Props) {
  const glyph = glyphFor(id);
  const rawSrc = id === "potion" ? "/icons/abilities/potion.png" : abilityIconUrl(id);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === rawSrc;

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(null);
    chromaKeyIconUrl(rawSrc).then((url) => {
      if (!cancelled) setDisplaySrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [rawSrc]);

  if (!preferIcon || failed) {
    return (
      <span className={`skill-glyph ${className}`.trim()} style={style} aria-hidden>
        {glyph}
      </span>
    );
  }

  if (!displaySrc) {
    return (
      <span className={`skill-glyph ${className}`.trim()} style={style} aria-hidden>
        {glyph}
      </span>
    );
  }

  return (
    <img
      className={`skill-icon ${className}`.trim()}
      src={displaySrc}
      alt=""
      draggable={false}
      decoding="async"
      style={style}
      onError={() => setFailedSrc(rawSrc)}
    />
  );
}

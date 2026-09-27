import { Html } from "@react-three/drei";
import type { UnitSnapshot } from "@bellgrave/protocol";
import { AbilityIcon } from "./AbilityIcon";
import { worldStatusIcons } from "./statusIcons";
import { worldHtmlPortalRef } from "./worldHtml";

type Props = {
  unit: UnitSnapshot;
  /** World Y for the icon column (beside torso / head). */
  y?: number;
};

/**
 * Floating buff (players) / debuff (mobs) icons beside a unit billboard.
 */
export function UnitStatusIcons({ unit, y = 1.55 }: Props) {
  const icons = worldStatusIcons(unit);
  if (icons.length === 0) return null;

  // Slightly to the character's right in screen space (Html is camera-facing).
  const x = unit.kind === "mob" ? 0.62 : 0.55;

  return (
    <Html
      center={false}
      transform={false}
      position={[x, y, 0]}
      portal={worldHtmlPortalRef}
      zIndexRange={[8, 1]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        className={`unit-status-icons ${icons[0]?.kind === "debuff" ? "debuffs" : "buffs"}`}
        aria-hidden
      >
        {icons.map((s) => (
          <div key={s.id} className={`unit-status-icon ${s.kind}`} title={s.id}>
            <AbilityIcon id={s.id} />
          </div>
        ))}
      </div>
    </Html>
  );
}

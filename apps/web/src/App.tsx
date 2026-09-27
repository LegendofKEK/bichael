import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { ITEM, ZONES } from "@bellgrave/config";
import { BootScreens, Hud, castAbility, hotbarAbilityAt, hotbarIndexFromCode } from "./Hud";
import { connectSocket, send } from "./net";
import { useGame } from "./state";
import { applyUiSettings, loadUiSettings } from "./uiSettings";
import { WorldScene } from "./WorldScene";
import { enterZoneMusic, unlockZoneMusic } from "./zoneMusic";
import { unlockCombatSfx } from "./combatSfx";
import { worldHtmlRootRef } from "./worldHtml";

export function App() {
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    applyUiSettings(loadUiSettings());
  }, []);

  useEffect(() => {
    connectSocket();
  }, []);

  // Pale Hollow BGM while in play; other zones call enterZoneMusic with their track (or omit to keep this).
  useEffect(() => {
    if (phase !== "play") return;
    enterZoneMusic(ZONES.pale_hollow.music);
  }, [phase]);

  useEffect(() => {
    const unlock = () => {
      unlockZoneMusic();
      unlockCombatSfx();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useGame.getState().phase !== "play") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const keyIdx = hotbarIndexFromCode(e.code);
      if (keyIdx != null) {
        e.preventDefault();
        const id = hotbarAbilityAt(keyIdx, e.shiftKey ? 1 : 0);
        if (id) castAbility(id);
        return;
      }
      if (e.key === "q" || e.key === "Q") send({ type: "item/use", tokenId: ITEM.POTION });
      if (e.key === "r" || e.key === "R") castAbility("rest");
      if (e.key === "b" || e.key === "B") {
        window.dispatchEvent(new CustomEvent("bellgrave:toggle-bag"));
      }
      if (e.key === "k" || e.key === "K") {
        window.dispatchEvent(new CustomEvent("bellgrave:toggle-spellbook"));
      }
      if (e.key === "c" || e.key === "C") {
        window.dispatchEvent(new CustomEvent("bellgrave:toggle-craft"));
      }
      if (e.key === "Escape") {
        if (useGame.getState().npcDialog) {
          useGame.getState().setNpcDialog(null);
        } else {
          send({ type: "disengage" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {phase === "play" && (
        <Canvas
          camera={{ position: [18, 22, 18], fov: 40, near: 0.1, far: 220 }}
          dpr={1}
          shadows={false}
          gl={{ antialias: false, powerPreference: "high-performance", localClippingEnabled: true }}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Nested Suspense lives inside WorldScene so lights/sky paint immediately;
              optional prop sheets and unit sprites stream in without blacking the canvas. */}
          <WorldScene />
        </Canvas>
      )}
      {/* World nameplates / status Html portal - below HUD menus */}
      <div
        ref={worldHtmlRootRef}
        className="world-html-root"
        aria-hidden
      />
      <BootScreens />
      <Hud />
    </div>
  );
}

import type { AbilityId } from "@bellgrave/combat";

import type { BuffState, UnitSnapshot } from "@bellgrave/protocol";

export type WorldStatusIcon = {
  /** Ability / status icon id under /icons/abilities */
  id: AbilityId;
  kind: "buff" | "debuff";
};

/**
 * Active lasting statuses for world billboard icons.
 * Buffs → players; debuffs → enemies (mobs).
 */
export function worldStatusIcons(unit: UnitSnapshot, now = Date.now()): WorldStatusIcon[] {
  const b = unit.buffs;
  const out: WorldStatusIcon[] = [];

  if (unit.kind === "player") {
    if (b.flux) out.push({ id: "flux", kind: "buff" });
    if (b.aether) out.push({ id: "aether", kind: "buff" });
    if (b.overclockUntil > now) out.push({ id: "overclock", kind: "buff" });
    else if (b.hasteUntil > now || b.quickenUntil > now) out.push({ id: "haste", kind: "buff" });
    if (b.timeSealUntil > now) out.push({ id: "time_seal", kind: "buff" });
    if (b.perpetualUntil > now) out.push({ id: "perpetual_motion", kind: "buff" });
    if (b.ghostStepUntil > now) out.push({ id: "ghost_step", kind: "buff" });
    if (b.backbladeUntil > now) out.push({ id: "backblade", kind: "buff" });
    if (b.killEdgeUntil > now) out.push({ id: "kill_edge", kind: "buff" });
    if (b.shadowPassUntil > now) out.push({ id: "shadow_pass", kind: "buff" });
    if (b.manaWallUntil > now) out.push({ id: "mana_wall", kind: "buff" });
    if (
      b.moveUntil > now &&
      b.movePct > 0 &&
      !(b.hasteUntil > now || b.quickenUntil > now || b.overclockUntil > now)
    ) {
      out.push({
        id: unit.job === "rogue" ? "dust_runner" : "tempo",
        kind: "buff",
      });
    }
    if (b.bulwarkUntil > now) out.push({ id: "bulwark", kind: "buff" });
    if (b.sentinelUntil > now) out.push({ id: "sentinel", kind: "buff" });
    if (b.coverUntil > now) out.push({ id: "cover", kind: "buff" });
    if (b.rampartUntil > now) out.push({ id: "rampart", kind: "buff" });
    if (b.fealtyUntil > now) out.push({ id: "fealty", kind: "buff" });
    if (b.guardianUntil > now) out.push({ id: "guardian", kind: "buff" });
    if (b.protectUntil > now) out.push({ id: "kn_protect", kind: "buff" });
    if (b.shellUntil > now) out.push({ id: "kn_shell", kind: "buff" });
    if (b.asylumUntil > now) out.push({ id: "asylum", kind: "buff" });
    if (b.healAbsorbUntil > now && b.healAbsorbHp > 0) out.push({ id: "solace_rite", kind: "buff" });
    if (b.regenUntil > now) out.push({ id: "cl_regen", kind: "buff" });
    if (b.solaceRite) out.push({ id: "solace_rite", kind: "buff" });
  }

  if (unit.kind === "mob") {
    if (b.slowUntil > now) out.push({ id: "slow", kind: "debuff" });
    if (b.bindUntil > now) out.push({ id: "bind", kind: "debuff" });
    if (b.gravityUntil > now) out.push({ id: "gravity", kind: "debuff" });
    if (b.distractUntil > now) out.push({ id: "distract", kind: "debuff" });
    if (b.frazzleUntil > now) out.push({ id: "frazzle", kind: "debuff" });
    if (b.addleUntil > now) out.push({ id: "addle", kind: "debuff" });
    if (b.silenceUntil > now) out.push({ id: "silencega", kind: "debuff" });
    if (b.paraUntil > now) out.push({ id: "paralyga", kind: "debuff" });
    if (b.petrifyUntil > now) out.push({ id: "temporal_distortion", kind: "debuff" });
    if (b.stunUntil > now) out.push({ id: "split_second", kind: "debuff" });
    if (b.blindUntil > now) out.push({ id: "kn_flash", kind: "debuff" });
    if (b.falseGuardUntil > now) out.push({ id: "false_guard", kind: "debuff" });
    if (b.sleepUntil > now) out.push({ id: "bm_sleep", kind: "debuff" });
    if (b.diaUntil > now) out.push({ id: "bm_dia", kind: "debuff" });
    if (b.bioUntil > now) out.push({ id: "bm_bio", kind: "debuff" });
    if (b.atkDownUntil > now) out.push({ id: "ws_sword_vorpal_blade", kind: "debuff" });
  }

  return out;
}

/** True if any lasting status should render beside this unit. */
export function hasWorldStatusIcons(buffs: BuffState, kind: UnitSnapshot["kind"], now = Date.now()): boolean {
  if (kind === "player") {
    return (
      buffs.flux ||
      buffs.aether ||
      buffs.overclockUntil > now ||
      buffs.hasteUntil > now ||
      buffs.quickenUntil > now ||
      buffs.timeSealUntil > now ||
      buffs.perpetualUntil > now ||
      (buffs.moveUntil > now && buffs.movePct > 0) ||
      buffs.ghostStepUntil > now ||
      buffs.backbladeUntil > now ||
      buffs.killEdgeUntil > now ||
      buffs.shadowPassUntil > now ||
      buffs.manaWallUntil > now ||
      buffs.bulwarkUntil > now ||
      buffs.sentinelUntil > now ||
      buffs.coverUntil > now ||
      buffs.rampartUntil > now ||
      buffs.fealtyUntil > now ||
      buffs.guardianUntil > now ||
      buffs.protectUntil > now ||
      buffs.shellUntil > now ||
      buffs.asylumUntil > now ||
      (buffs.healAbsorbUntil > now && buffs.healAbsorbHp > 0) ||
      buffs.regenUntil > now ||
      buffs.solaceRite
    );
  }
  if (kind === "mob") {
    return (
      buffs.slowUntil > now ||
      buffs.bindUntil > now ||
      buffs.gravityUntil > now ||
      buffs.distractUntil > now ||
      buffs.frazzleUntil > now ||
      buffs.addleUntil > now ||
      buffs.silenceUntil > now ||
      buffs.paraUntil > now ||
      buffs.petrifyUntil > now ||
      buffs.stunUntil > now ||
      buffs.blindUntil > now ||
      buffs.falseGuardUntil > now ||
      buffs.sleepUntil > now ||
      buffs.diaUntil > now ||
      buffs.bioUntil > now ||
      buffs.atkDownUntil > now
    );
  }
  return false;
}

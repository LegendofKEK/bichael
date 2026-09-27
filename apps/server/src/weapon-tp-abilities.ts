import type {
  AbilityId,
  WeaponTpAbilityId,
  WeaponTpDef,
  WeaponType,
} from "@bellgrave/combat";
import {
  GUARD_L1,
  WEAPON_TP_ABILITIES,
  WEAPON_TP_COST,
  attackFromStats,
  defenseFromVit,
  fStr,
  physicalDamage,
  weaponTpBonusDamage,
  weaponTypeFromTokenId,
} from "@bellgrave/combat";

export type WeaponTpPlayer = {
  wallet: string;
  x: number;
  z: number;
  facing: number;
  tp: number;
  level: number;
  job: string;
  equip: { main: number | null; body: number | null };
  anim: string;
  animUntil: number;
  recasts: Partial<Record<AbilityId, number>>;
  targetId: string | null;
};

export type WeaponTpMob = {
  id: string;
  name: string;
  x: number;
  z: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  stunUntil: number;
  paraUntil: number;
  slowUntil: number;
  swingPenalty: number;
  atkDownUntil: number;
  atkDownMul: number;
  diaUntil: number;
};

export type WeaponTpCtx = {
  pushLog: (p: WeaponTpPlayer, msg: string) => void;
  stopRest: (p: WeaponTpPlayer, reason?: string) => void;
  facingTo: (ax: number, az: number, bx: number, bz: number) => number;
  findMob: (id: string | null | undefined) => WeaponTpMob | null;
  onMobKill: (p: WeaponTpPlayer, m: WeaponTpMob) => void;
  dist: (ax: number, az: number, bx: number, bz: number) => number;
  meleeRange: number;
  playerWeaponBonus: (p: WeaponTpPlayer) => number;
  playerCombatStats: (p: WeaponTpPlayer) => {
    str: number;
    dex: number;
    vit: number;
    agi: number;
    int: number;
    mnd: number;
  };
};

function applyEffects(mob: WeaponTpMob, def: WeaponTpDef, now: number) {
  for (const fx of def.effects ?? []) {
    if (fx.kind === "stun") mob.stunUntil = Math.max(mob.stunUntil, now + fx.durationMs);
    else if (fx.kind === "para") mob.paraUntil = Math.max(mob.paraUntil, now + fx.durationMs);
    else if (fx.kind === "slow") {
      mob.slowUntil = Math.max(mob.slowUntil, now + fx.durationMs);
      mob.swingPenalty = Math.max(mob.swingPenalty, fx.penalty);
    } else if (fx.kind === "atk_down") {
      mob.atkDownUntil = Math.max(mob.atkDownUntil, now + fx.durationMs);
      mob.atkDownMul = Math.min(mob.atkDownMul || 1, fx.mul);
    }
  }
}

export function resolveWeaponTpAbility(
  p: WeaponTpPlayer,
  id: WeaponTpAbilityId,
  targetId: string | undefined,
  now: number,
  ctx: WeaponTpCtx,
): void {
  const def = WEAPON_TP_ABILITIES[id];
  if (!def) {
    ctx.pushLog(p, "Unknown weapon skill.");
    return;
  }

  const wtype: WeaponType | null = weaponTypeFromTokenId(p.equip.main);
  if (!wtype || wtype !== def.weapon) {
    ctx.pushLog(p, `${def.label} requires a ${def.weapon} equipped.`);
    return;
  }
  if (p.level < def.unlockLevel) {
    ctx.pushLog(p, `${def.label} unlocks at level ${def.unlockLevel}.`);
    return;
  }
  if (p.tp < WEAPON_TP_COST) {
    ctx.pushLog(p, `Need ${WEAPON_TP_COST} TP for ${def.label} (you have ${p.tp}).`);
    return;
  }
  const readyAt = p.recasts[id as AbilityId] ?? 0;
  if (now < readyAt) {
    ctx.pushLog(p, `${def.label} is not ready.`);
    return;
  }

  const tid = targetId ?? p.targetId;
  const mob = ctx.findMob(tid);
  if (!mob || !mob.alive) {
    ctx.pushLog(p, "No target for weapon skill.");
    return;
  }
  if (ctx.dist(p.x, p.z, mob.x, mob.z) > ctx.meleeRange + 0.35) {
    ctx.pushLog(p, "Too far for a weapon skill.");
    return;
  }

  ctx.stopRest(p, "weapon skill");
  p.facing = ctx.facingTo(p.x, p.z, mob.x, mob.z);
  p.anim = "melee";
  p.animUntil = now + 520;

  p.tp -= WEAPON_TP_COST;
  const bonus = weaponTpBonusDamage(p.tp);
  p.recasts[id as AbilityId] = now + def.recastMs;

  const stats = ctx.playerCombatStats(p);
  const physical = p.job !== "time_mage" && p.job !== "sorcerer" && p.job !== "cleric";
  let att = attackFromStats(stats, "none", ctx.playerWeaponBonus(p), { physical: true });
  let defStat = defenseFromVit(GUARD_L1.vit);
  if (now < mob.diaUntil) defStat = Math.max(1, Math.floor(defStat * 0.7));

  const hits = Math.max(1, def.hits);
  const perHitBonus = Math.floor(bonus / hits);
  let bonusLeft = bonus - perHitBonus * hits;
  let total = 0;
  const parts: number[] = [];

  for (let i = 0; i < hits; i++) {
    let hit = physicalDamage(
      att,
      defStat,
      fStr(stats.str, GUARD_L1.vit),
      false,
    );
    hit = Math.max(1, Math.floor(hit * def.ftp));
    hit += perHitBonus;
    if (i === hits - 1) hit += bonusLeft;
    parts.push(hit);
    total += hit;
    mob.hp = Math.max(0, mob.hp - hit);
    if (mob.hp <= 0) break;
  }

  applyEffects(mob, def, now);

  const fxNote =
    def.effects && def.effects.length
      ? ` · ${def.effects.map((e) => e.kind.replace("_", " ")).join(", ")}`
      : "";
  ctx.pushLog(
    p,
    `${def.label}! ${parts.join("+")}=${total} (${hits} hit${hits > 1 ? "s" : ""}, +${bonus} TP bonus)${fxNote}`,
  );

  if (mob.hp <= 0) {
    mob.alive = false;
    ctx.onMobKill(p, mob);
  }
}

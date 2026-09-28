import type { JobId } from "@bellgrave/protocol";

/**
 * Party system — invite / accept / decline / leave / kick / disband.
 * Max size = 11 (self + 10 others). Beneficial AoE + targeted ally spells
 * use partyAllyWallets(); kill XP shares with in-range party participants.
 */
export const PARTY_MAX_SIZE = 11;
export const PARTY_INVITE_RANGE = 28;
export const PARTY_INVITE_TTL_MS = 45_000;
/** Kill XP/dust share radius for party members near the corpse. */
export const PARTY_SHARE_RANGE = 40;

export type PartyMemberView = {
  id: string;
  name: string;
  level: number;
  job: JobId;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  online: boolean;
};

export type PartySnapshot = {
  id: string;
  leaderId: string;
  members: PartyMemberView[];
};

export type PartyInviteView = {
  fromId: string;
  fromName: string;
  partyId: string;
  expiresAt: number;
};

type Party = {
  id: string;
  leaderId: string;
  memberIds: string[];
};

type PendingInvite = {
  fromId: string;
  toId: string;
  partyId: string | null;
  expiresAt: number;
};

const parties = new Map<string, Party>();
const memberToParty = new Map<string, string>();
const pendingInvites = new Map<string, PendingInvite>();

let partySeq = 1;

function newPartyId(): string {
  partySeq += 1;
  return `pty_${Date.now().toString(36)}_${partySeq}`;
}

export function getPartyId(wallet: string): string | null {
  return memberToParty.get(wallet.toLowerCase()) ?? null;
}

export function getParty(wallet: string): Party | null {
  const id = getPartyId(wallet);
  if (!id) return null;
  return parties.get(id) ?? null;
}

export function isSameParty(a: string, b: string): boolean {
  const pa = getPartyId(a);
  if (!pa) return false;
  return pa === getPartyId(b);
}

export function clearPendingInvite(wallet: string) {
  pendingInvites.delete(wallet.toLowerCase());
}

export function getPendingInvite(wallet: string): PendingInvite | null {
  const inv = pendingInvites.get(wallet.toLowerCase());
  if (!inv) return null;
  if (Date.now() > inv.expiresAt) {
    pendingInvites.delete(wallet.toLowerCase());
    return null;
  }
  return inv;
}

function detachMember(wallet: string) {
  const key = wallet.toLowerCase();
  const pid = memberToParty.get(key);
  if (!pid) return;
  const party = parties.get(pid);
  memberToParty.delete(key);
  if (!party) return;
  party.memberIds = party.memberIds.filter((id) => id !== key);
  if (party.memberIds.length === 0) {
    parties.delete(pid);
    return;
  }
  if (party.leaderId === key) {
    party.leaderId = party.memberIds[0]!;
  }
}

export function leaveParty(wallet: string): { ok: boolean; message: string; affected: string[] } {
  const key = wallet.toLowerCase();
  const party = getParty(key);
  if (!party) return { ok: false, message: "You are not in a party.", affected: [] };
  const affected = [...party.memberIds];
  detachMember(key);
  clearPendingInvite(key);
  if (party.memberIds.length === 1) {
    const last = party.memberIds[0]!;
    detachMember(last);
    affected.push(last);
    return { ok: true, message: "You left the party (disbanded).", affected: [...new Set(affected)] };
  }
  if (!parties.has(party.id)) {
    return { ok: true, message: "You left the party (disbanded).", affected: [...new Set(affected)] };
  }
  return { ok: true, message: "You left the party.", affected: [...new Set(affected)] };
}

export function disbandParty(wallet: string): { ok: boolean; message: string; affected: string[] } {
  const key = wallet.toLowerCase();
  const party = getParty(key);
  if (!party) return { ok: false, message: "You are not in a party.", affected: [] };
  if (party.leaderId !== key) return { ok: false, message: "Only the party leader can disband.", affected: [] };
  const affected = [...party.memberIds];
  for (const id of affected) {
    memberToParty.delete(id);
    clearPendingInvite(id);
  }
  parties.delete(party.id);
  return { ok: true, message: "Party disbanded.", affected };
}

export function kickMember(
  leaderWallet: string,
  targetWallet: string,
): { ok: boolean; message: string; affected: string[] } {
  const leader = leaderWallet.toLowerCase();
  const target = targetWallet.toLowerCase();
  const party = getParty(leader);
  if (!party) return { ok: false, message: "You are not in a party.", affected: [] };
  if (party.leaderId !== leader) return { ok: false, message: "Only the leader can kick.", affected: [] };
  if (target === leader) return { ok: false, message: "Use leave/disband instead of kicking yourself.", affected: [] };
  if (!party.memberIds.includes(target)) return { ok: false, message: "That player is not in your party.", affected: [] };
  const affected = [...party.memberIds];
  detachMember(target);
  clearPendingInvite(target);
  if (party.memberIds.length <= 1) {
    for (const id of [...party.memberIds]) detachMember(id);
    return { ok: true, message: "Member kicked — party disbanded.", affected: [...new Set(affected)] };
  }
  return { ok: true, message: "Member kicked from the party.", affected: [...new Set(affected)] };
}

export function invitePlayer(
  fromWallet: string,
  toWallet: string,
): { ok: boolean; message: string; invite?: PendingInvite } {
  const from = fromWallet.toLowerCase();
  const to = toWallet.toLowerCase();
  if (from === to) return { ok: false, message: "You cannot invite yourself." };
  if (getPartyId(to)) return { ok: false, message: "That player is already in a party." };
  if (getPendingInvite(to)) return { ok: false, message: "That player already has a pending invite." };

  const party = getParty(from);
  if (party) {
    if (party.leaderId !== from) return { ok: false, message: "Only the party leader can invite." };
    if (party.memberIds.length >= PARTY_MAX_SIZE) {
      return { ok: false, message: `Party is full (max ${PARTY_MAX_SIZE}).` };
    }
  }

  const invite: PendingInvite = {
    fromId: from,
    toId: to,
    partyId: party?.id ?? null,
    expiresAt: Date.now() + PARTY_INVITE_TTL_MS,
  };
  pendingInvites.set(to, invite);
  return { ok: true, message: "Invite sent.", invite };
}

export function acceptInvite(wallet: string): { ok: boolean; message: string; affected: string[] } {
  const key = wallet.toLowerCase();
  const inv = getPendingInvite(key);
  if (!inv) return { ok: false, message: "No pending party invite.", affected: [] };
  clearPendingInvite(key);

  if (getPartyId(key)) return { ok: false, message: "You are already in a party.", affected: [] };

  let party = inv.partyId ? parties.get(inv.partyId) ?? null : null;
  const inviterParty = getParty(inv.fromId);
  if (inviterParty && inviterParty.leaderId === inv.fromId) {
    party = inviterParty;
  }

  if (!party) {
    if (getPartyId(inv.fromId)) {
      return { ok: false, message: "Invite expired (inviter already in another party).", affected: [] };
    }
    const id = newPartyId();
    party = { id, leaderId: inv.fromId, memberIds: [inv.fromId] };
    parties.set(id, party);
    memberToParty.set(inv.fromId, id);
  }

  if (party.memberIds.length >= PARTY_MAX_SIZE) {
    return { ok: false, message: `Party is full (max ${PARTY_MAX_SIZE}).`, affected: [...party.memberIds] };
  }
  if (!party.memberIds.includes(key)) {
    party.memberIds.push(key);
  }
  memberToParty.set(key, party.id);
  return { ok: true, message: "You joined the party.", affected: [...party.memberIds] };
}

export function declineInvite(wallet: string): { ok: boolean; message: string; fromId?: string } {
  const inv = getPendingInvite(wallet);
  if (!inv) return { ok: false, message: "No pending party invite." };
  clearPendingInvite(wallet);
  return { ok: true, message: "Party invite declined.", fromId: inv.fromId };
}

export function partyAllyWallets(wallet: string): string[] {
  const party = getParty(wallet);
  if (!party) return [wallet.toLowerCase()];
  return [...party.memberIds];
}

export function buildPartySnapshot(
  wallet: string,
  lookup: (id: string) => {
    name: string;
    level: number;
    job: JobId;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    online: boolean;
  } | null,
): PartySnapshot | null {
  const party = getParty(wallet);
  if (!party) return null;
  const members: PartyMemberView[] = [];
  for (const id of party.memberIds) {
    const u = lookup(id);
    if (!u) {
      members.push({
        id,
        name: id.slice(0, 10),
        level: 1,
        job: "time_mage",
        hp: 0,
        maxHp: 1,
        mp: 0,
        maxMp: 1,
        online: false,
      });
      continue;
    }
    members.push({ id, ...u });
  }
  return { id: party.id, leaderId: party.leaderId, members };
}

export function buildInviteView(
  wallet: string,
  nameOf: (id: string) => string,
): PartyInviteView | null {
  const inv = getPendingInvite(wallet);
  if (!inv) return null;
  return {
    fromId: inv.fromId,
    fromName: nameOf(inv.fromId),
    partyId: inv.partyId ?? "",
    expiresAt: inv.expiresAt,
  };
}

export function onPlayerDisconnect(wallet: string): string[] {
  clearPendingInvite(wallet);
  const result = leaveParty(wallet);
  return result.affected;
}

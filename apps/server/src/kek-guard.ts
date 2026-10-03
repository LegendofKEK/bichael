/** In-process reserve and per-token lock for spendable KEK. Not a mint. */

const reserved = new Map<string, bigint>();
const tails = new Map<string, Promise<void>>();
const claimBusy = new Set<string>();
const claimNotBefore = new Map<string, number>();

/** One claim cast at a time per character, and not more than once per five seconds. */
export const CLAIM_GAP_MS = 5_000;

export function reservedOf(token: string): bigint {
  return reserved.get(token) ?? 0n;
}

export function withKekLock<T>(token: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(token) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  tails.set(
    token,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function reserveKek(
  token: string,
  amount: bigint,
  balance: bigint,
): { ok: true } | { ok: false; error: string } {
  if (amount <= 0n) return { ok: false, error: "Bad KEK amount. Nothing was reserved." };
  const hold = reservedOf(token);
  if (balance < hold + amount) {
    const free = balance > hold ? balance - hold : 0n;
    return { ok: false, error: "Need " + amount.toString() + " KEK (you have " + free.toString() + " spendable). Nothing was queued." };
  }
  reserved.set(token, hold + amount);
  return { ok: true };
}

export function releaseKek(token: string, amount: bigint): { ok: true } | { ok: false; error: string } {
  const hold = reservedOf(token);
  if (amount < 0n || hold < amount) return { ok: false, error: "Reserved KEK could not be returned." };
  const next = hold - amount;
  if (next === 0n) reserved.delete(token);
  else reserved.set(token, next);
  return { ok: true };
}

type VaultOk = { ok: true; id: string; availableAt: number };
type VaultErr = { ok: false; error: string };

/**
 * Reserve spendable KEK, then queue. The log debit runs only after the queue exists.
 * A failed queue releases the reserve. The per-token lock is held for the whole attempt
 * so a transfer cannot spend the same deposit while the vault call is in flight.
 * If the queue exists but the log debit fails, the reserve stays so that KEK cannot also be sent.
 */
export async function guardedWithdraw(args: {
  token: string;
  amount: string;
  balanceOf: () => string;
  debit: () => { ok: true } | { ok: false; error: string };
  queue: () => Promise<VaultOk | VaultErr>;
}): Promise<VaultOk | VaultErr> {
  return withKekLock(args.token, async () => {
    let cost: bigint;
    let bal: bigint;
    try {
      cost = BigInt(args.amount);
      bal = BigInt(args.balanceOf());
    } catch {
      return { ok: false, error: "Bad KEK amount. Nothing was spent." };
    }
    const held = reserveKek(args.token, cost, bal);
    if (!held.ok) return held;
    let queued: VaultOk | VaultErr;
    try {
      queued = await args.queue();
    } catch (err) {
      const back = releaseKek(args.token, cost);
      if (!back.ok) return { ok: false, error: "Withdrawal threw and the reserve could not be returned." };
      return { ok: false, error: "Withdrawal was not queued. Reserved KEK was returned." };
    }
    if (!queued.ok) {
      const back = releaseKek(args.token, cost);
      if (!back.ok) return { ok: false, error: queued.error + " Reserved KEK could not be returned." };
      return queued;
    }
    const spent = args.debit();
    if (!spent.ok) {
      return {
        ok: false,
        error: "The vault withdrawal was queued, but spendable KEK was not debited. It stays reserved. " + spent.error,
      };
    }
    const back = releaseKek(args.token, cost);
    if (!back.ok) return { ok: false, error: "Withdrawal was debited, but the reservation could not be cleared." };
    return queued;
  });
}

/** Serialize any other spend of this character's KEK behind an in-flight withdrawal. */
export function guardedKekMove<T>(token: string, fn: () => T): Promise<T> {
  return withKekLock(token, async () => fn());
}

export function beginClaim(token: string, now: number): { ok: true } | { ok: false; error: string } {
  if (claimBusy.has(token)) return { ok: false, error: "A claim is already in progress." };
  const notBefore = claimNotBefore.get(token) ?? 0;
  if (now < notBefore) return { ok: false, error: "Wait a moment before claiming again." };
  claimBusy.add(token);
  claimNotBefore.set(token, now + CLAIM_GAP_MS);
  return { ok: true };
}

export function endClaim(token: string): void {
  claimBusy.delete(token);
}

/** Reject before any cast. A foreign id does not start a vault claim. */
export function prepareClaim(
  callerToken: string,
  row: { tokenId: string } | undefined,
  now: number,
): { ok: true } | { ok: false; error: string } {
  const gate = beginClaim(callerToken, now);
  if (!gate.ok) return gate;
  if (!row) {
    endClaim(callerToken);
    return { ok: false, error: "That withdrawal is not queued on this server." };
  }
  if (row.tokenId !== callerToken) {
    endClaim(callerToken);
    return { ok: false, error: "That withdrawal belongs to another character." };
  }
  return { ok: true };
}

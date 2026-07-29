// Password hashing (argon2id) + DB-backed login lockout.
//
// WHY argon2id AND NOT THE SOURCE APP'S PBKDF2: the app this was ported from ran
// on an edge runtime with no native argon2 binding, so PBKDF2-over-WebCrypto was
// a platform constraint there, not a choice. We run on Node, so we use the
// memory-hard primitive the family standard mandates (contract #76): argon2id via
// @node-rs/argon2 (prebuilt — no native toolchain on Windows).
//
// TWO INDEPENDENT BRUTE-FORCE DEFENCES:
//   1. `defineRoute({ rateLimit: … })` — cheap in-memory throttle per client key.
//   2. this module — DB-backed lockout counted from `auth_attempts`, so it holds
//      across process restarts and multiple app instances:
//        * MAX_FAILED_ATTEMPTS          (5) per (email, ip) / 15 min
//        * MAX_FAILED_ATTEMPTS_PER_USER (15) per email, IP-INDEPENDENT
//      Either ceiling ⇒ HTTP 423 Locked.
//
// The IP-independent ceiling is load-bearing here, not belt-and-braces: with
// TRUSTED_PROXY_HOPS=0 (the default, app-is-the-edge) `clientIp()` deliberately
// returns "unknown" for every caller, so the per-(email, ip) counter degenerates
// into a single shared bucket. The per-email ceiling is what still bounds a
// distributed attempt when a proxy IS configured.
//
// NOTE: the reference family app relaxes the lockout for localhost outside
// production. That backdoor is NOT ported — same reasoning as dropping the
// dev-fallback SESSION_SECRET. Use `scripts/reset-pin.ts` to clear a lockout.

import { hash, verify, type Options } from "@node-rs/argon2";
import { query, execute } from "@/lib/db";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/domain/contracts/auth";

/** OWASP-aligned argon2id parameters (memory in KiB) — contract-mandated. */
const ARGON2_OPTS: Options = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

// Re-exported so server code has one import for "the password policy" while the
// constant itself stays in the client-safe contracts module.
export { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH };

/** Failed attempts allowed per (email, ip) inside the window. */
export const MAX_FAILED_ATTEMPTS = 5;
/** Failed attempts allowed per email across ALL IPs inside the window. */
export const MAX_FAILED_ATTEMPTS_PER_USER = 15;
/** Sliding window (minutes) both ceilings are counted over. */
export const LOCKOUT_WINDOW_MINUTES = 15;

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Validate a NEW password against the policy. Returns a Slovak error message, or
 * null when acceptable. Kept separate from zod so scripts (which have no request
 * body) share the exact same rule.
 */
export function passwordPolicyError(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Heslo musí mať aspoň ${MIN_PASSWORD_LENGTH} znakov.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return "Heslo je príliš dlhé.";
  return null;
}

/** Thrown by `hashPassword` when the policy is violated. */
export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}

// ---------------------------------------------------------------------------
// Hash / verify
// ---------------------------------------------------------------------------

/**
 * Hash a NEW password with argon2id. Enforces the length policy at the ONE choke
 * point every create/change/reset path goes through, so a caller that forgets the
 * zod schema still cannot store a 4-character password.
 */
export async function hashPassword(password: string): Promise<string> {
  const problem = passwordPolicyError(password);
  if (problem) throw new PasswordPolicyError(problem);
  return hash(password, ARGON2_OPTS);
}

/**
 * Verify a password against a stored argon2 hash. Returns false for a missing
 * hash or a malformed/foreign encoding — never throws, so a corrupt row cannot
 * turn into a 500 on the login path.
 */
export async function verifyPassword(
  hashed: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!hashed) return false;
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Attempt log + lockout
// ---------------------------------------------------------------------------

// SCHEMA NOTE: `auth_attempts.username` (VARCHAR(255)) holds the E-MAIL typed at
// the login form — the column name is inherited from the family baseline, where
// the login identity was a username. This app has no username concept; every
// helper below takes an `email`.

/** Record one login attempt (audit trail + the lockout counters read it back). */
export async function recordAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await execute(
    "INSERT INTO auth_attempts (username, ip, success) VALUES (?, ?, ?)",
    [email, ip, success ? 1 : 0],
  );
}

/** Failed attempts for (email, ip) inside the lockout window. */
export async function recentFailedAttempts(
  email: string,
  ip: string,
): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM auth_attempts
      WHERE username = ?
        AND ip = ?
        AND success = 0
        AND ts >= (NOW() - INTERVAL ? MINUTE)`,
    [email, ip, LOCKOUT_WINDOW_MINUTES],
  );
  return Number(rows[0]?.c ?? 0);
}

/** Failed attempts for an email across every IP inside the lockout window. */
export async function recentFailedAttemptsForUser(
  email: string,
): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM auth_attempts
      WHERE username = ?
        AND success = 0
        AND ts >= (NOW() - INTERVAL ? MINUTE)`,
    [email, LOCKOUT_WINDOW_MINUTES],
  );
  return Number(rows[0]?.c ?? 0);
}

/**
 * The lockout decision, isolated from I/O so it is unit-testable: locked when
 * EITHER ceiling is reached.
 */
export function isLockedByCounts(
  failedForIp: number,
  failedForUser: number,
): boolean {
  return (
    failedForIp >= MAX_FAILED_ATTEMPTS ||
    failedForUser >= MAX_FAILED_ATTEMPTS_PER_USER
  );
}

/** True when (email, ip) is currently locked out. Checked BEFORE hashing work. */
export async function isLockedOut(email: string, ip: string): Promise<boolean> {
  const [perIp, perUser] = await Promise.all([
    recentFailedAttempts(email, ip),
    recentFailedAttemptsForUser(email),
  ]);
  return isLockedByCounts(perIp, perUser);
}

/**
 * Drop the failed-attempt history for (email, ip) after a successful login, so a
 * user who mistyped four times and then succeeded starts from zero again.
 */
export async function clearFailedAttempts(
  email: string,
  ip: string,
): Promise<void> {
  await execute(
    "DELETE FROM auth_attempts WHERE username = ? AND ip = ? AND success = 0",
    [email, ip],
  );
}

/** Clear every failed attempt for an email regardless of IP (admin unlock). */
export async function clearAllFailedAttempts(email: string): Promise<void> {
  await execute("DELETE FROM auth_attempts WHERE username = ? AND success = 0", [
    email,
  ]);
}

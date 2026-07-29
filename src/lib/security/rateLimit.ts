// In-memory rate limiter (fixed-window) keyed by an arbitrary string — designed
// to be keyed by `ip + ":" + route`.
//
// SCOPE / LIMITATIONS (read before relying on this):
//   * In-memory + per-process. With `output: 'standalone'` behind a single Node
//     process this is effective. If you scale to multiple instances each keeps
//     its own counters — move to a shared store for a global cap. The login
//     LOCKOUT is DB-backed (auth_attempts) and therefore already correct across
//     instances; this limiter is a cheap front-line throttle.
//   * Counters live on `globalThis` so Next.js dev hot-reloads and multiple
//     route-module instances share one map (same pattern as the DB pool).
//   * A lazy sweep evicts expired windows on access, bounding memory under key
//     churn.
//
// Runtime-agnostic (no node:crypto / DB).

import { clientIp } from "./clientIp";

interface RlWindow {
  /** Count of requests observed in the current window. */
  count: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

interface Bucket {
  windows: Map<string, RlWindow>;
  /** Last time we swept this bucket for expired windows (epoch ms). */
  lastSweep: number;
}

declare global {
  var __auraRoadmapRateLimit: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!globalThis.__auraRoadmapRateLimit) {
    globalThis.__auraRoadmapRateLimit = new Map();
  }
  return globalThis.__auraRoadmapRateLimit;
}

// Sweep a bucket at most this often to keep memory bounded under key churn.
const SWEEP_INTERVAL_MS = 60_000;

function sweep(bucket: Bucket, now: number): void {
  if (now - bucket.lastSweep < SWEEP_INTERVAL_MS) return;
  for (const [k, w] of bucket.windows) {
    if (w.resetAt <= now) bucket.windows.delete(k);
  }
  bucket.lastSweep = now;
}

export interface RateLimitOptions {
  /** Logical bucket name (e.g. "login"); isolates one route's counters. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** True when the request is within the limit and may proceed. */
  allowed: boolean;
  /** Requests still permitted in the current window (0 when blocked). */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
  /** Seconds until reset — convenient for a `Retry-After` header. */
  retryAfterSeconds: number;
}

/**
 * Record one hit for `key` within the named bucket and report whether it is
 * allowed. Fixed-window algorithm: the first hit in a window starts the timer,
 * subsequent hits increment the counter, and once `limit` is exceeded further
 * hits in the window are blocked until `resetAt`.
 *
 * @example
 *   const rl = rateLimit(`${clientKeyFromHeaders(req.headers)}:login`, RATE_LIMITS.login);
 *   if (!rl.allowed) return Response.json({ error: "Priveľa požiadaviek — skús o chvíľu." }, {
 *     status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) },
 *   });
 */
export function rateLimit(
  key: string,
  { name, limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const s = store();
  let bucket = s.get(name);
  if (!bucket) {
    bucket = { windows: new Map(), lastSweep: now };
    s.set(name, bucket);
  }
  sweep(bucket, now);

  let w = bucket.windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + windowMs };
    bucket.windows.set(key, w);
  }

  w.count += 1;
  const allowed = w.count <= limit;
  const remaining = allowed ? limit - w.count : 0;
  return {
    allowed,
    remaining,
    resetAt: w.resetAt,
    retryAfterSeconds: Math.max(0, Math.ceil((w.resetAt - now) / 1000)),
  };
}

/**
 * Derive a stable client key from request headers via the spoofing-resistant
 * `clientIp` helper. Pass the result joined with a route tag, e.g.
 * `${clientKeyFromHeaders(h)}:login`.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  return clientIp(headers);
}

/**
 * Convenience presets for the routes that must be throttled.
 *
 * These buckets are keyed by CLIENT IP, not by user, and the whole team sits
 * behind one NAT address — so a limit is shared by everyone in the office, not
 * spent per person. They also have to absorb the app's fan-out: one Prehľad load
 * issues seven list requests, and Timeline issues one per visible sprint column.
 *
 * The original read/write/heavy numbers were calibrated as if one screen were one
 * request. At read 120 and heavy 30 a single user clicking around tripped the limit
 * within a minute (measured: first 429 at request 85 of a plain list endpoint), and
 * every screen then rendered "Údaje sa nepodarilo načítať". They are raised here to
 * match the real fan-out.
 *
 * `login` is deliberately NOT raised. It is the security-critical bucket, it backs
 * up the DB lockout, and ten attempts a minute is already generous for a human.
 */
export const RATE_LIMITS = {
  /** Login: complements the DB-backed lockout with a fast in-memory throttle. */
  login: { name: "login", limit: 10, windowMs: 60_000 },
  /** Generic read endpoints (lists, detail). ~85 screen loads/min at 7 reads each. */
  read: { name: "read", limit: 600, windowMs: 60_000 },
  /** Generic write endpoints (create/update/delete). */
  write: { name: "write", limit: 120, windowMs: 60_000 },
  /** Heavy/aggregating endpoints (overview KPIs, timeline). */
  heavy: { name: "heavy", limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;

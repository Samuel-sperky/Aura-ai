// CSRF defense-in-depth for the cookie session.
//
// The session cookie (`aura_roadmap_session`) is http-only + SameSite=Lax +
// Secure-in-prod. SameSite=Lax already blocks the cross-site cases that matter
// most (it is NOT sent on cross-site POST/PUT/PATCH/DELETE). This module adds a
// SECOND, independent layer: an Origin/Referer same-origin check enforced in the
// proxy for every state-changing API request. Defense-in-depth — if SameSite is
// ever weakened, a browser mis-handles it, or a same-site-but-different-origin
// subdomain is introduced, this still rejects the forged request.
//
// Runtime-agnostic (pure header math, no node:crypto / DB) so it is safe to
// import from the proxy AND from any route handler that re-checks defensively.

/** HTTP methods that mutate state and therefore require the CSRF origin check. */
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Paths EXEMPT from the same-origin check.
 *
 * `/api/auth/login` is the bootstrap call: it is made before any session
 * exists, carries no ambient cookie authority to abuse (credentials must be
 * supplied) and is independently protected by per-(email, ip) lockout. A CSRF
 * "attack" on login can at most attempt a login the attacker already has
 * credentials for.
 *
 * Everything else under /api that mutates state is checked.
 */
const CSRF_EXEMPT_PATHS = new Set<string>(["/api/auth/login"]);

export interface CsrfDecision {
  /** True when the request may proceed (safe method, exempt, or same-origin). */
  ok: boolean;
  /** Human-readable reason, surfaced in the 403 body / logs when ok=false. */
  reason: string;
}

/** Is this an HTTP method that changes state (and thus needs CSRF protection)? */
export function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

/** Is this path exempt from the same-origin CSRF check? */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.has(pathname);
}

/**
 * Parse an absolute URL and return its lowercased `host` header form
 * (`host[:port]`) — what an Origin/Referer host should equal. Returns null for a
 * malformed/relative URL.
 */
function originHost(value: string): string | null {
  try {
    const u = new URL(value);
    // `u.host` includes the port when non-default, matching the Host header.
    return u.host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Decide whether a request passes the CSRF same-origin check.
 *
 * Rules, in order:
 *   1. Safe (non-state-changing) methods → always OK (GET/HEAD/OPTIONS).
 *   2. Exempt paths (`/api/auth/login`) → OK.
 *   3. Otherwise the request MUST present an Origin (preferred) or Referer whose
 *      host equals the server's own host. The expected host comes from the
 *      trusted, proxy-set `x-forwarded-host` when present, else `Host`. A
 *      missing/foreign/malformed Origin AND Referer → reject.
 *
 * We deliberately FAIL CLOSED for state-changing API requests with no usable
 * Origin/Referer: legitimate same-origin browser fetch()/form posts always send
 * at least one of them.
 */
export function checkCsrf(req: {
  method: string;
  pathname: string;
  headers: Headers;
}): CsrfDecision {
  if (!isStateChangingMethod(req.method)) {
    return { ok: true, reason: "safe method" };
  }
  if (isCsrfExempt(req.pathname)) {
    return { ok: true, reason: "exempt path" };
  }

  const h = req.headers;
  // Prefer the forwarded host set by a trusted reverse proxy; fall back to the
  // Host header for direct connections.
  const expectedHost = (
    h.get("x-forwarded-host") ??
    h.get("host") ??
    ""
  ).toLowerCase();

  if (!expectedHost) {
    // Without a Host we cannot prove same-origin; fail closed.
    return { ok: false, reason: "missing Host header" };
  }

  const origin = h.get("origin");
  if (origin) {
    // Some user agents send the literal "null" origin (sandboxed iframe,
    // file://). Treat that as cross-origin → reject.
    if (origin === "null") return { ok: false, reason: "null Origin" };
    const oHost = originHost(origin);
    if (!oHost) return { ok: false, reason: "malformed Origin" };
    return oHost === expectedHost
      ? { ok: true, reason: "same-origin (Origin)" }
      : {
          ok: false,
          reason: `cross-origin Origin (${oHost} != ${expectedHost})`,
        };
  }

  // No Origin header — fall back to Referer.
  const referer = h.get("referer");
  if (referer) {
    const rHost = originHost(referer);
    if (!rHost) return { ok: false, reason: "malformed Referer" };
    return rHost === expectedHost
      ? { ok: true, reason: "same-origin (Referer)" }
      : {
          ok: false,
          reason: `cross-origin Referer (${rHost} != ${expectedHost})`,
        };
  }

  // Neither Origin nor Referer on a state-changing request → fail closed.
  return { ok: false, reason: "missing Origin and Referer" };
}

/** The canonical 403 response for a failed CSRF check (Slovak message). */
export function csrfErrorResponse(decision: CsrfDecision): Response {
  return Response.json(
    { error: "Požiadavka bola odmietnutá (CSRF kontrola)." },
    { status: 403, headers: { "x-csrf-reason": decision.reason } },
  );
}

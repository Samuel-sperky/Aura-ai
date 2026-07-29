// Central, spoofing-resistant client-IP derivation.
//
// SECURITY: `X-Forwarded-For` and `X-Real-IP` are CLIENT-SETTABLE unless a
// trusted reverse proxy overwrites them. Reading the LEFT-MOST XFF hop is
// exactly the value an attacker controls — anyone could forge an arbitrary IP
// and thereby reset the per-IP login lockout and the in-memory rate limits,
// enabling unbounded brute force and poisoning the audit log.
//
// This module is the single source of truth for "who is the client". Both the
// audit logger and the rate limiter delegate here, so the audited IP and the
// throttle key always match.
//
// TRUSTED_PROXY_HOPS = number of trusted reverse proxies between the public
// edge and this app:
//   * 0 (default) — the app IS the network edge. Forwarding headers cannot be
//     trusted, so we IGNORE them and every request keys as "unknown".
//   * n ≥ 1 — n trusted proxies. We trust `X-Real-IP` when present, else take
//     the hop `n` positions from the RIGHT of `X-Forwarded-For`.
//
// Kept dependency-light (process.env + the Web `Headers` type only) so it works
// in any runtime (Node route handlers, proxy).

/** Parsed TRUSTED_PROXY_HOPS (≥ 0). Defaults to 0 when unset/invalid. */
export function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Derive the real client IP from request headers, resistant to forwarding-header
 * spoofing. Returns "unknown" when no trustworthy value is available (rather
 * than a client-controlled one) so spoofed requests share a single bucket.
 */
export function clientIp(headers: Headers): string {
  const hops = trustedProxyHops();

  // No trusted proxy in front → the app is the edge. Do NOT read forgeable
  // forwarding headers at all.
  if (hops <= 0) return "unknown";

  // A trusted proxy overwrites X-Real-IP with the real peer; prefer it.
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  // Otherwise count `hops` trusted proxies in from the right of X-Forwarded-For:
  // each proxy appends its peer, so the IP the OUTERMOST trusted proxy observed
  // sits at index (length - hops).
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const idx = parts.length - hops;
      return parts[idx >= 0 ? idx : 0]!;
    }
  }

  return "unknown";
}

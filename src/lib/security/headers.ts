// Centralized security-header definitions.
//
// Single source of truth for the app's security headers + Content-Security-
// Policy. `next.config.ts` consumes `SECURITY_HEADERS` in its async `headers()`
// so the headers apply to every response (pages, route handlers, static).
//
// Runtime-agnostic (pure data + string building). No secrets, no node:crypto.

/**
 * Content-Security-Policy directives.
 *
 * Rationale per directive (documented relaxations called out):
 *   - default-src 'self'          : deny by default; only same-origin.
 *   - script-src 'self' 'unsafe-inline' (+ 'unsafe-eval' in dev)
 *                                 : *** REQUIRED for Next.js App Router. *** Next
 *                                   streams the RSC payload + hydration bootstrap
 *                                   as INLINE <script>self.__next_f.push(...)</script>
 *                                   tags, and the root layout runs an inline
 *                                   pre-paint theme script (anti-flash). A bare
 *                                   'self' blocks all of it, leaving a
 *                                   non-hydrated SSR shell (dead buttons).
 *                                   Dev additionally needs 'unsafe-eval' for
 *                                   webpack/React Refresh.
 *   - style-src 'self' 'unsafe-inline'
 *                                 : *** DOCUMENTED RELAXATION *** — components use
 *                                   inline `style={{…}}` and the framework emits
 *                                   inline <style>. Low risk: inline styles cannot
 *                                   execute script.
 *   - img-src 'self' data: blob:  : same-origin images + data:/blob: (recharts
 *                                   object URLs, inline SVG data URIs).
 *   - font-src 'self' data:       : self-hosted (next/font) + data: fonts.
 *   - connect-src 'self'          : XHR/fetch/WebSocket to our origin only (+ ws:
 *                                   in dev for HMR).
 *   - frame-ancestors 'none'      : this app may not be framed (anti-clickjacking).
 *   - base-uri 'self'             : block <base> tag hijacking.
 *   - form-action 'self'          : forms may only submit to our origin.
 *   - object-src 'none'           : no <object>/<embed> (legacy XSS sink).
 *   - frame-src 'none'            : no nested browsing contexts.
 *   - upgrade-insecure-requests   : transparently upgrade any http subresource.
 *
 * NOTE: no `report-uri`/`report-to` (no collector in this deployment).
 */
const IS_DEV = process.env.NODE_ENV !== "production";

const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": IS_DEV
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"], // see rationale above (styles only)
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'", "data:"],
  "connect-src": IS_DEV ? ["'self'", "ws:", "wss:"] : ["'self'"],
  "frame-ancestors": ["'none'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

/** Build the CSP header value from the directive map (+ valueless directives). */
export function buildCsp(): string {
  const parts = Object.entries(CSP_DIRECTIVES).map(
    ([k, v]) => `${k} ${v.join(" ")}`,
  );
  parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export const CONTENT_SECURITY_POLICY = buildCsp();

/**
 * The full set of security headers applied to every response.
 *
 * - Strict-Transport-Security: force HTTPS for 2 years incl. subdomains.
 *   Emitted ONLY in production — a dev hitting the app over https (self-signed
 *   cert or a tunnel) would otherwise get a 2-year pin that breaks local HTTP.
 * - X-Content-Type-Options: nosniff — stop MIME sniffing.
 * - X-Frame-Options: DENY — legacy anti-clickjacking (CSP frame-ancestors is the
 *   modern control; both are sent for older browsers).
 * - Cross-Origin-Opener-Policy: same-origin — isolate our top-level browsing
 *   context (mitigates cross-window leaks / tab-nabbing).
 * - Referrer-Policy: strict-origin-when-cross-origin.
 * - Permissions-Policy: disable camera, microphone, geolocation, Topics API.
 * - X-Permitted-Cross-Domain-Policies: none — deny legacy Adobe policy files.
 * - X-DNS-Prefetch-Control: off — don't leak DNS lookups for external links.
 */
const BASE_SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// HSTS only in production (see rationale above). Two years, subdomains, preload.
const HSTS_HEADER = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
} as const;

export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> =
  IS_DEV ? BASE_SECURITY_HEADERS : [...BASE_SECURITY_HEADERS, HSTS_HEADER];

// Route observability — one structured line per notable request.
//
// WHY THIS EXISTS: `defineRoute` used to log only unhandled exceptions. Everything
// it handled deliberately — 401, 400, and above all 429 — was silent. When the read
// rate limit was mis-calibrated, every screen rendered "Údaje sa nepodarilo načítať"
// while `docker logs` showed four lines total, so the failing endpoint had to be
// found by measuring from the browser instead of by reading the log. A refused
// request is exactly the request worth recording.
//
// WHAT IS LOGGED: method, path, status, duration, a short reason, and the acting
// user id. Deliberately NOT logged: request bodies, query values, headers, cookies,
// tokens — a log line must never become a place secrets leak to. The path is taken
// from the URL without its query string for the same reason.
//
// LEVELS: 5xx → console.error, 4xx → console.warn, slow 2xx → console.warn.
// A normal fast 2xx is not logged; per-request noise would bury the signal.

/** Requests slower than this are logged even when they succeed. */
export const SLOW_REQUEST_MS = 1000;

export interface RouteLogEvent {
  method: string;
  /** Full request URL; only the pathname is recorded. */
  url: string;
  status: number;
  /** Wall-clock duration in milliseconds. */
  ms: number;
  /** Short machine-ish reason, e.g. "rate_limited", "bad_body", "unhandled". */
  reason?: string;
  /** Acting user id, when the request got past the auth gate. */
  userId?: string | null;
  /** Error to attach — only for 5xx, where the stack is the point. */
  error?: unknown;
}

/** Pathname only: query strings can carry filter values and search terms. */
function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "(unparseable-url)";
  }
}

/**
 * Record one request outcome. Never throws: logging must not be able to turn a
 * working response into a failed one.
 */
export function logRoute(event: RouteLogEvent): void {
  try {
    const { method, status, ms, reason, userId } = event;
    if (status < 400 && ms < SLOW_REQUEST_MS) return;

    const line = [
      `[api] ${method} ${pathOf(event.url)} ${status} ${Math.round(ms)}ms`,
      reason ? `reason=${reason}` : null,
      userId ? `user=${userId}` : null,
      status < 400 ? "slow" : null,
    ]
      .filter(Boolean)
      .join(" ");

    if (status >= 500) {
      console.error(line, event.error ?? "");
    } else {
      console.warn(line);
    }
  } catch {
    // Swallow: a broken log line is never worth failing a request over.
  }
}

// Typed fetch client shared by every client-side page.
//
// Goals:
//   - One place that knows how to talk to our /api/* route handlers.
//   - Always send the session cookie (credentials: "include") — the JWT lives in
//     the http-only `aura_roadmap_session` cookie.
//   - Always speak JSON; parse the body once and surface a typed error.
//   - On 401 (session gone/expired) bounce to /login, preserving where the user
//     was. Server-side RBAC is still the real gate — this is only UX.
//   - Expose the VERSION_CONFLICT (409) case as a first-class check so optimistic
//     concurrency can be handled uniformly in the UI.
//
// CLIENT-SAFE: uses only `fetch` + `window`. Do NOT import any server-only module.

/**
 * Error thrown when a response is not ok (status >= 400) or the network/parse
 * fails. Carries the HTTP status and any structured payload the server returned.
 */
export class ApiError extends Error {
  /** HTTP status code (0 if the request never completed, e.g. network error). */
  readonly status: number;
  /** Parsed JSON body of the error response, if any. */
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** True for a 409 VERSION_CONFLICT from an optimistic-concurrency check. */
  get isVersionConflict(): boolean {
    return (
      this.status === 409 &&
      isPlainObject(this.body) &&
      this.body.code === "VERSION_CONFLICT"
    );
  }

  /** The server's current row version when `isVersionConflict`, else null. */
  get currentVersion(): number | null {
    if (!this.isVersionConflict || !isPlainObject(this.body)) return null;
    const v = this.body.currentVersion;
    return typeof v === "number" ? v : null;
  }
}

/** Shape our route handlers use for errors: `{ error: "..." }`. */
interface ServerError {
  error?: string;
  message?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Pull a human-readable message out of whatever the server returned. */
function messageFromBody(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (isPlainObject(body)) {
    const e = body as ServerError;
    if (typeof e.error === "string" && e.error) return e.error;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}

/** Redirect to /login, remembering the current path. No-op during SSR. */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  const here = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(here)}`);
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  /** Extra headers merged onto the defaults. */
  headers?: Record<string, string>;
  /** AbortSignal to cancel the request (e.g. on unmount). */
  signal?: AbortSignal;
}

/** The canonical list envelope returned by `jsonList` on the server. */
export interface ListResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  };
  const init: RequestInit = {
    method,
    credentials: "include",
    headers,
    signal: opts.signal,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    // Re-throw aborts untouched so callers can detect cancellation.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "Chyba siete — skontrolujte pripojenie alebo či beží server.",
      0,
      err,
    );
  }

  const isNoContent =
    res.status === 204 || res.headers.get("content-length") === "0";

  let payload: unknown = undefined;
  if (!isNoContent) {
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        // Non-JSON body (e.g. an HTML error page). Keep the raw text.
        payload = text;
      }
    }
  }

  if (res.status === 401) {
    redirectToLogin();
    throw new ApiError(messageFromBody(payload, "Neprihlásený."), 401, payload);
  }

  if (!res.ok) {
    throw new ApiError(
      messageFromBody(payload, `Požiadavka zlyhala (${res.status}).`),
      res.status,
      payload,
    );
  }

  return payload as T;
}

/** GET `path`, parsed as JSON `T`. */
export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, opts);
}

/** POST `body` (JSON) to `path`, parsed response as `T`. */
export function apiPost<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>("POST", path, body, opts);
}

/** PATCH `body` (JSON) to `path`, parsed response as `T`. */
export function apiPatch<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>("PATCH", path, body, opts);
}

/** PUT `body` (JSON) to `path`, parsed response as `T`. */
export function apiPut<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>("PUT", path, body, opts);
}

/** DELETE `path` (optionally with a JSON body), parsed response as `T`. */
export function apiDelete<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>("DELETE", path, body, opts);
}

/** Build a query string from a params object, skipping empty values. */
export function qs(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

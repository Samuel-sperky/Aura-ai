// Canonical JSON response helpers for the REST API.
//
// ONE list shape for every list endpoint, so the client never has to guess the
// envelope per route:
//
//   { items: T[], pagination: { page, pageSize, total, totalPages, hasMore } }
//
// `jsonOk` is a thin typed wrapper over `Response.json` for non-list payloads.
// Errors are ALWAYS `{ error: "<slovenská správa>" }` — see `jsonError`.
//
// No DB/zod deps — safe to import from route handlers and from defineRoute.

/** The canonical pagination envelope returned alongside a list. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** The canonical list response body: rows under `items` + a `pagination` block. */
export interface ListResponse<T> {
  items: T[];
  pagination: PageMeta;
}

/**
 * Build the canonical list response `{ items, pagination }`.
 *
 * `pageMeta` is the same shape produced by `lib/domain/data.pageMeta(...)`:
 *   return jsonList(rows.map(toDTO), pageMeta(pg, total));
 */
export function jsonList<T>(
  items: T[],
  pageMeta: PageMeta,
  init?: ResponseInit,
): Response {
  const body: ListResponse<T> = { items, pagination: pageMeta };
  return Response.json(body, init);
}

/**
 * Build a plain JSON OK response for non-list payloads (single entities,
 * summaries, ad-hoc objects).
 *
 * @example
 *   return jsonOk({ project });                  // 200
 *   return jsonOk({ project }, { status: 201 }); // created
 */
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/**
 * The canonical error envelope: `{ error: "<slovenská správa>" }`.
 * Extra fields (e.g. `code`, `currentVersion`) may be merged for machine-
 * readable cases such as VERSION_CONFLICT.
 */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
  init?: ResponseInit,
): Response {
  return Response.json({ error: message, ...extra }, { ...init, status });
}

/** 204 No Content — for deletes that return nothing. */
export function jsonNoContent(): Response {
  return new Response(null, { status: 204 });
}

// ---------------------------------------------------------------------------
// Named error responses
// ---------------------------------------------------------------------------
// These live HERE, not in defineRoute.ts, because they are pure `jsonError`
// wrappers with no dependency on auth, the DB pool or the env loader. Keeping
// them in the pipeline module meant that merely importing "the 409 helper"
// dragged in rbac → session → env, which validates (and throws) at module load.
// `defineRoute.ts` re-exports all three, so every existing import site is
// unchanged.

/**
 * The 409 response for a failed optimistic-concurrency check. Ported from the
 * source app — the one thing it did better than the family baseline. The client
 * shows the Slovak message and refetches; `code` lets it branch, `currentVersion`
 * lets it show what it is up against.
 */
export function versionConflict(currentVersion: number): Response {
  return jsonError(
    "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
    409,
    { code: "VERSION_CONFLICT", currentVersion },
  );
}

/** 404 with the canonical envelope. */
export function notFound(message = "Záznam sa nenašiel."): Response {
  return jsonError(message, 404);
}

/** 400 with the canonical envelope. */
export function badRequest(message = "Neplatný vstup."): Response {
  return jsonError(message, 400);
}

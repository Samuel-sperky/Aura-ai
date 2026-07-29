// defineRoute — the ONE pipeline every API handler in this app goes through.
// 100 % adoption is a contract requirement: there is no handler without it.
//
// It collapses the auth + rate-limit + zod + error-mapping boilerplate into a
// declarative call:
//
//   export const GET = defineRoute(
//     {
//       auth: "user",
//       rateLimit: RATE_LIMITS.read,
//       querySchema: ProjectListQuery,
//     },
//     async ({ user, query }) => jsonList(rows, pageMeta(pg, total)),
//   );
//
// ORDER OF OPERATIONS (fixed — do not reorder):
//   1. auth gate            → authErrorResponse(err) on failure (fail-closed)
//   2. rate limit (if set)  → 429 + Retry-After (Slovak message)
//   3. zod parse query/body → 400 with the FIRST issue message
//   4. handler(ctx)         → its Response is returned as-is
//   5. any thrown error     → AuthError maps via authErrorResponse, everything
//                             else becomes a uniform 500 JSON.
//
// The handler still receives the raw `req` and resolved `params`, so anything
// not covered declaratively (custom headers, streaming, a second body shape)
// remains possible.
//
// OPTIMISTIC CONCURRENCY: set `version: true` and the pipeline reads the numeric
// `version` field from the parsed body and hands it to the handler as
// `ctx.version`. The handler compares it against the stored row and returns
// `versionConflict(currentVersion)` on a mismatch — a 409 with
// `{ error, code: "VERSION_CONFLICT", currentVersion }`. Applies to the three
// tables that carry `version`: checkpoints, sprints, work_items.
//
// DYNAMIC ROUTES: `ctx.params` is typed `Record<string, string>` by default (the
// `Opts` generic must stay inferable, so the Params generic cannot be supplied
// without also spelling out Opts). Narrow it at the top of the handler:
//     const { id } = params as { id: string };
// This is verified against Next 16's generated per-route type checks.

import type { z } from "zod";
import {
  requireUser,
  requireRight,
  requireAdmin,
  authErrorResponse,
  AuthError,
  type AppUser,
} from "@/lib/auth/rbac";
import { rateLimit, clientKeyFromHeaders } from "@/lib/security/rateLimit";
import { jsonError, versionConflict, notFound, badRequest } from "./respond";

// `versionConflict` / `notFound` / `badRequest` are defined in ./respond (pure
// `jsonError` wrappers, no auth/DB/env in their import graph) and re-exported
// here so `@/lib/api/defineRoute` remains the one import route handlers use.
export { versionConflict, notFound, badRequest };

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------

/**
 * Auth requirement for the route:
 *   - "user"            — any authenticated user (requireUser)
 *   - "admin"           — must be an admin (requireAdmin)
 *   - { right: string } — must hold the named right (requireRight)
 *   - omitted           — no auth gate (PUBLIC; `ctx.user` is null)
 */
export type AuthRequirement = "user" | "admin" | { right: string };

/** Rate-limit config (same fields as lib/security/rateLimit.RateLimitOptions). */
export interface RouteRateLimit {
  /** Logical bucket name (isolates this route's counters), e.g. "write". */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface DefineRouteOptions<
  QSchema extends z.ZodTypeAny | undefined = undefined,
  BSchema extends z.ZodTypeAny | undefined = undefined,
> {
  /** Auth gate. Omit for a public route. */
  auth?: AuthRequirement;
  /** Optional per-(ip+route) throttle, applied AFTER the auth gate. */
  rateLimit?: RouteRateLimit;
  /** Optional zod schema for the URL query string (parsed object). */
  querySchema?: QSchema;
  /** Optional zod schema for the JSON request body. */
  bodySchema?: BSchema;
  /**
   * Declarative optimistic concurrency. When true the pipeline extracts the
   * numeric `version` from the parsed body into `ctx.version`. Requires
   * `bodySchema` to include `version` (see contracts). A missing/non-numeric
   * value is rejected with 400.
   */
  version?: true;
}

// Resolve a schema (or undefined) to the parsed output type the handler sees.
type Parsed<S> = S extends z.ZodTypeAny ? z.infer<S> : undefined;
// The user passed to the handler: AppUser when gated, null when public.
type CtxUser<A> = A extends AuthRequirement ? AppUser : null;
// ctx.version is a number only when `version: true` was declared.
type CtxVersion<V> = V extends true ? number : undefined;

/** The context object passed to a defineRoute handler. */
export interface RouteContext<
  QSchema extends z.ZodTypeAny | undefined,
  BSchema extends z.ZodTypeAny | undefined,
  Params,
  Auth,
  Version,
> {
  /** Authenticated user (AppUser) when `auth` is set; otherwise null. */
  user: CtxUser<Auth>;
  /** Parsed query object (typed by `querySchema`); undefined if no schema. */
  query: Parsed<QSchema>;
  /** Parsed JSON body (typed by `bodySchema`); undefined if no schema. */
  body: Parsed<BSchema>;
  /** Client-supplied row version when `version: true`; otherwise undefined. */
  version: CtxVersion<Version>;
  /** The raw Web Request. */
  req: Request;
  /** Resolved dynamic route params (e.g. { id }); {} for non-dynamic routes. */
  params: Params;
}

/** A defineRoute handler: receives the ctx, returns a Response (maybe async). */
export type RouteHandler<
  QSchema extends z.ZodTypeAny | undefined,
  BSchema extends z.ZodTypeAny | undefined,
  Params,
  Auth,
  Version,
> = (
  ctx: RouteContext<QSchema, BSchema, Params, Auth, Version>,
) => Response | Promise<Response>;

// The Next.js handler signature: (req, { params: Promise<…> }). Next 16 emits a
// per-route type check (.next/types/app/**) that requires the second argument to
// be REQUIRED and its `params` promise to accept the route's own param shape, so
// we type it as `Promise<unknown>` (covariantly accepts `Promise<{ id: string }>`
// for dynamic routes and `Promise<{}>` for static ones) and cast once inside.
type NextRouteCtx = { params: Promise<unknown> };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Pull a friendly message out of a ZodError (first issue). */
function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Neplatný vstup";
}

/** Run the configured auth gate, returning the user or throwing AuthError. */
async function runAuth(auth: AuthRequirement): Promise<AppUser> {
  if (auth === "user") return requireUser();
  if (auth === "admin") return requireAdmin();
  return requireRight(auth.right);
}

/** Read + JSON-parse the request body; distinguishes "invalid JSON" from value. */
async function readJson(
  req: Request,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return { ok: false };
  }
}

/** Extract a positive integer `version` from a parsed body object. */
function extractVersion(body: unknown): number | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as Record<string, unknown>).version;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

// ---------------------------------------------------------------------------
// defineRoute
// ---------------------------------------------------------------------------

/**
 * Build a Next.js route handler from declarative options + a typed handler.
 * Returns a function with the framework's `(req, ctx)` signature.
 */
export function defineRoute<
  const Opts extends DefineRouteOptions<
    z.ZodTypeAny | undefined,
    z.ZodTypeAny | undefined
  >,
  Params = Record<string, string>,
>(
  opts: Opts,
  handler: RouteHandler<
    Opts["querySchema"],
    Opts["bodySchema"],
    Params,
    Opts["auth"],
    Opts["version"]
  >,
): (req: Request, ctx: NextRouteCtx) => Promise<Response> {
  return async (req: Request, ctx: NextRouteCtx): Promise<Response> => {
    try {
      // 1. Auth gate (fail-closed: any failure → authErrorResponse).
      let user: AppUser | null = null;
      if (opts.auth !== undefined) {
        try {
          user = await runAuth(opts.auth);
        } catch (err) {
          return authErrorResponse(err);
        }
      }

      // 2. Rate limit (after auth, so unauthenticated traffic is rejected first).
      if (opts.rateLimit) {
        const key = `${clientKeyFromHeaders(req.headers)}:${opts.rateLimit.name}`;
        const rl = rateLimit(key, opts.rateLimit);
        if (!rl.allowed) {
          return jsonError("Priveľa požiadaviek — skús o chvíľu.", 429, undefined, {
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
      }

      // 3a. Query validation.
      let query: unknown = undefined;
      if (opts.querySchema) {
        const url = new URL(req.url);
        const raw: Record<string, string> = {};
        for (const [k, v] of url.searchParams.entries()) raw[k] = v;
        const parsed = opts.querySchema.safeParse(raw);
        if (!parsed.success) return badRequest(firstIssue(parsed.error));
        query = parsed.data;
      }

      // 3b. Body validation (only consume the body when a schema is declared).
      let body: unknown = undefined;
      if (opts.bodySchema) {
        const read = await readJson(req);
        if (!read.ok) return badRequest("Neplatné JSON telo požiadavky.");
        const parsed = opts.bodySchema.safeParse(read.data);
        if (!parsed.success) return badRequest(firstIssue(parsed.error));
        body = parsed.data;
      }

      // 3c. Optimistic concurrency: lift `version` out of the validated body.
      let version: number | undefined = undefined;
      if (opts.version === true) {
        const v = extractVersion(body);
        if (v === null) {
          return badRequest(
            "Chýba verzia záznamu (version) — obnovte údaje a skúste to znova.",
          );
        }
        version = v;
      }

      // Resolve dynamic route params ({} for non-dynamic routes).
      const params = ((await ctx?.params) ?? {}) as Params;

      // 4. Run the handler with the assembled, typed context.
      const ctxObj = {
        user,
        query,
        body,
        version,
        req,
        params,
      } as RouteContext<
        Opts["querySchema"],
        Opts["bodySchema"],
        Params,
        Opts["auth"],
        Opts["version"]
      >;

      return await handler(ctxObj);
    } catch (err) {
      // 5. Uniform error mapping. A handler may throw AuthError to bail with a
      // specific status; anything else is an unexpected server error.
      if (err instanceof AuthError) return authErrorResponse(err);
      console.error("Unhandled route error:", err);
      return jsonError("Nastala neočakávaná chyba servera.", 500);
    }
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// `./defineRoute` pulls in the RBAC guards → @/lib/auth/session → @/lib/db.
// Mocking db keeps this suite from ever constructing a real MariaDB pool. (The
// dummy secrets that satisfy the fail-closed env loader live centrally in
// vitest.config.ts `test.env` — see defineRoute.test.ts for the full note.)
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  execute: vi.fn(),
  withTransaction: vi.fn(),
  getPool: vi.fn(),
}));

// Only the three gates are replaced; AuthError and authErrorResponse stay real
// so `err instanceof AuthError` in the pipeline still matches what we throw.
vi.mock("@/lib/auth/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/rbac")>();
  return {
    ...actual,
    requireUser: vi.fn(),
    requireAdmin: vi.fn(),
    requireRight: vi.fn(),
  };
});

import { AuthError, requireUser } from "@/lib/auth/rbac";
import { defineRoute } from "./defineRoute";
import { versionConflict } from "./respond";
import { logRoute, SLOW_REQUEST_MS, type RouteLogEvent } from "./logging";

function captureConsole() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return { warn, error };
}

afterEach(() => {
  vi.restoreAllMocks();
});

const base = {
  method: "GET",
  url: "http://localhost:3040/api/projects?q=secret&area=Interné",
  ms: 12,
};

describe("logRoute", () => {
  it("stays silent for a fast success — per-request noise buries the signal", () => {
    const { warn, error } = captureConsole();
    logRoute({ ...base, status: 200 });
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a slow success so latency is visible without logging every hit", () => {
    const { warn } = captureConsole();
    logRoute({ ...base, status: 200, ms: SLOW_REQUEST_MS + 1 });
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain("slow");
  });

  it("warns on 4xx and records the reason — this is the 429 case that was silent", () => {
    const { warn, error } = captureConsole();
    logRoute({ ...base, status: 429, reason: "rate_limited:read" });
    expect(error).not.toHaveBeenCalled();
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("429");
    expect(line).toContain("rate_limited:read");
  });

  it("errors on 5xx and passes the thrown value through for its stack", () => {
    const { error } = captureConsole();
    const boom = new Error("boom");
    logRoute({ ...base, status: 500, reason: "unhandled", error: boom });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][1]).toBe(boom);
  });

  it("records the pathname only — a query string can carry search terms", () => {
    const { warn } = captureConsole();
    logRoute({ ...base, status: 400, reason: "bad_query" });
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("/api/projects");
    expect(line).not.toContain("secret");
    expect(line).not.toContain("Interné");
    expect(line).not.toContain("?");
  });

  it("includes the acting user but never a body or headers", () => {
    const { warn } = captureConsole();
    logRoute({ ...base, status: 403, reason: "auth_denied", userId: "u-1" });
    expect(String(warn.mock.calls[0][0])).toContain("user=u-1");
  });

  it("survives an unparseable url and still reports the outcome", () => {
    const { warn, error } = captureConsole();
    expect(() =>
      logRoute({ method: "GET", url: "not a url", status: 500, ms: 1 }),
    ).not.toThrow();
    // A 500 goes to console.error, so `warn` must stay untouched — and the line
    // still has to carry the status rather than being dropped over a bad URL.
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toContain("(unparseable-url)");
    expect(String(error.mock.calls[0][0])).toContain("500");
  });

  it("never throws even when console itself blows up", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {
      throw new Error("console gone");
    });
    expect(() => logRoute({ ...base, status: 404 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The pipeline half of the contract.
//
// These live next to the logging unit tests rather than in defineRoute.test.ts
// because what they assert is the logging contract: EVERY exit of the pipeline
// must produce a line, and no exit may produce one containing request data.
// ---------------------------------------------------------------------------

/** A dynamic route ctx; the pipeline awaits `params` for every request. */
const noParams = { params: Promise.resolve({}) };

/** Unique bucket per test: rate-limit counters live on globalThis. */
let bucket = 0;
function freshBucket(limit: number) {
  bucket += 1;
  return { name: `test-log-${bucket}`, limit, windowMs: 60_000 };
}

describe("defineRoute logs every exit", () => {
  it("is silent for a fast successful request", async () => {
    const { warn, error } = captureConsole();
    const route = defineRoute({}, async () => Response.json({ ok: true }));
    const res = await route(new Request("http://x/api/health"), noParams);
    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs the 429 the pipeline used to swallow", async () => {
    const { warn } = captureConsole();
    const route = defineRoute(
      { rateLimit: freshBucket(1) },
      async () => Response.json({ ok: true }),
    );
    const req = () => new Request("http://x/api/projects");
    expect((await route(req(), noParams)).status).toBe(200);
    const limited = await route(req(), noParams);

    expect(limited.status).toBe(429);
    expect(warn).toHaveBeenCalledOnce();
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("429");
    expect(line).toContain("/api/projects");
    expect(line).toContain("reason=rate_limited:test-log-");
  });

  it("logs a rejected auth gate with reason=auth_denied", async () => {
    const { warn } = captureConsole();
    vi.mocked(requireUser).mockRejectedValue(
      new AuthError("Neprihlásený.", 401),
    );
    const route = defineRoute({ auth: "user" }, async () =>
      Response.json({ ok: true }),
    );
    const res = await route(new Request("http://x/api/auth/me"), noParams);

    expect(res.status).toBe(401);
    expect(String(warn.mock.calls[0][0])).toContain("reason=auth_denied");
  });

  it("logs each rejected input shape with its own reason", async () => {
    const cases: Array<[string, () => Promise<Response>]> = [
      [
        "bad_query",
        () => {
          const route = defineRoute(
            { querySchema: z.object({ page: z.coerce.number().int().min(1) }) },
            async () => Response.json({ ok: true }),
          );
          return route(new Request("http://x/api/projects?page=0"), noParams);
        },
      ],
      [
        "bad_json",
        () => {
          const route = defineRoute(
            { bodySchema: z.object({ name: z.string() }) },
            async () => Response.json({ ok: true }),
          );
          return route(
            new Request("http://x/api/projects", {
              method: "POST",
              body: "{not json",
            }),
            noParams,
          );
        },
      ],
      [
        "bad_body",
        () => {
          const route = defineRoute(
            { bodySchema: z.object({ name: z.string().min(3) }) },
            async () => Response.json({ ok: true }),
          );
          return route(
            new Request("http://x/api/projects", {
              method: "POST",
              body: JSON.stringify({ name: "" }),
            }),
            noParams,
          );
        },
      ],
      [
        "missing_version",
        () => {
          const route = defineRoute(
            {
              bodySchema: z.object({ version: z.number().optional() }),
              version: true,
            },
            async () => Response.json({ ok: true }),
          );
          return route(
            new Request("http://x/api/checkpoints/1", {
              method: "PATCH",
              body: JSON.stringify({}),
            }),
            noParams,
          );
        },
      ],
    ];

    for (const [reason, run] of cases) {
      const { warn } = captureConsole();
      const res = await run();
      expect(res.status, reason).toBe(400);
      expect(warn, reason).toHaveBeenCalledOnce();
      expect(String(warn.mock.calls[0][0])).toContain(`reason=${reason}`);
      vi.restoreAllMocks();
    }
  });

  it("logs a status the handler chose itself, e.g. a 409 version conflict", async () => {
    const { warn } = captureConsole();
    const route = defineRoute({}, async () => versionConflict(3));
    const res = await route(
      new Request("http://x/api/sprints/7", { method: "PATCH" }),
      noParams,
    );

    expect(res.status).toBe(409);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("409");
    expect(line).toContain("reason=handler");
  });

  it("logs an unhandled throw as a 500 carrying the original error", async () => {
    const { error } = captureConsole();
    const boom = new Error("db is down");
    const route = defineRoute({}, async () => {
      throw boom;
    });
    const res = await route(new Request("http://x/api/projects"), noParams);

    expect(res.status).toBe(500);
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toContain("reason=unhandled");
    expect(error.mock.calls[0][1]).toBe(boom);
  });

  it("never puts a query value, cookie, header or body field in the line", async () => {
    const { warn, error } = captureConsole();
    const route = defineRoute(
      { bodySchema: z.object({ pin: z.string().min(8) }) },
      async () => Response.json({ ok: true }),
    );
    const res = await route(
      new Request("http://x/api/auth/change-password?token=qtokenq", {
        method: "POST",
        headers: {
          cookie: "aura_session=qcookieq",
          authorization: "Bearer qbearerq",
          "x-secret": "qheaderq",
        },
        body: JSON.stringify({ pin: "qbodyq" }),
      }),
      noParams,
    );

    expect(res.status).toBe(400);
    expect(error).not.toHaveBeenCalled();
    // A 4xx must be a single string argument: a second argument is how an error
    // object (and whatever request data it closed over) would reach the log.
    expect(warn.mock.calls[0]).toHaveLength(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("POST /api/auth/change-password 400");
    for (const secret of [
      "qtokenq",
      "qcookieq",
      "qbearerq",
      "qheaderq",
      "qbodyq",
    ]) {
      expect(line, `leaked ${secret}`).not.toContain(secret);
    }
  });
});

// ---------------------------------------------------------------------------
// Observability must never be load-bearing. `logRoute` guards itself, but the
// pipeline must not depend on that promise: inside the try block a throwing
// logger would be re-caught as "unhandled" and then throw again on the way out,
// turning a finished 200 into an unhandled rejection. Replacing the module is
// the only way to prove the guard in `done()` is real, hence the re-import.
// ---------------------------------------------------------------------------

describe("a broken logger cannot fail a request", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("./logging");
    vi.resetModules();
  });

  async function withExplodingLogger() {
    const calls: RouteLogEvent[] = [];
    vi.doMock("./logging", () => ({
      SLOW_REQUEST_MS,
      logRoute: (event: RouteLogEvent) => {
        calls.push(event);
        throw new Error("logger exploded");
      },
    }));
    const { defineRoute: subject } = await import("./defineRoute");
    return { subject, calls };
  }

  it("keeps a successful response intact", async () => {
    const { subject, calls } = await withExplodingLogger();
    const route = subject({}, async () => Response.json({ ok: true }));
    const res = await route(new Request("http://x/api/health"), noParams);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(1);
  });

  it("still returns the uniform 500 when the handler threw as well", async () => {
    const { subject, calls } = await withExplodingLogger();
    const route = subject({}, async () => {
      throw new Error("db is down");
    });
    const res = await route(new Request("http://x/api/projects"), noParams);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Nastala neočakávaná chyba servera.",
    });
    // Exactly one attempt: the throwing logger must not re-enter the catch and
    // log the same request twice.
    expect(calls).toHaveLength(1);
  });
});

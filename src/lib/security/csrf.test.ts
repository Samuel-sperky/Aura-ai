// The CSRF gate is an acceptance criterion (contract §8/14) and it is FAIL-CLOSED:
// a state-changing /api request with no usable Origin or Referer must be REJECTED,
// not waved through. That property is one `return` away from being inverted, and
// nothing was pinning it — hence this suite.
//
// Pure header math, no DOM/DB, so it runs as a plain unit test.

import { describe, it, expect } from "vitest";
import {
  checkCsrf,
  csrfErrorResponse,
  isCsrfExempt,
  isStateChangingMethod,
} from "./csrf";

const HOST = "roadmap.local:3040";

/** A request descriptor with the given headers, POSTing to a protected path. */
function req(headers: Record<string, string>, method = "POST", pathname = "/api/projects") {
  return { method, pathname, headers: new Headers(headers) };
}

describe("isStateChangingMethod", () => {
  it("covers exactly the mutating verbs, case-insensitively", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "post", "delete"]) {
      expect(isStateChangingMethod(m)).toBe(true);
    }
    for (const m of ["GET", "HEAD", "OPTIONS", "get"]) {
      expect(isStateChangingMethod(m)).toBe(false);
    }
  });
});

describe("isCsrfExempt", () => {
  it("exempts ONLY /api/auth/login", () => {
    expect(isCsrfExempt("/api/auth/login")).toBe(true);
    // Everything else, including the other auth endpoints, is checked. Logout and
    // change-password carry ambient cookie authority and must not be forgeable.
    expect(isCsrfExempt("/api/auth/logout")).toBe(false);
    expect(isCsrfExempt("/api/auth/change-password")).toBe(false);
    expect(isCsrfExempt("/api/projects")).toBe(false);
    // No prefix/suffix escape hatch.
    expect(isCsrfExempt("/api/auth/login/")).toBe(false);
    expect(isCsrfExempt("/api/auth/login/../projects")).toBe(false);
  });
});

describe("checkCsrf — fail-closed behaviour", () => {
  it("REJECTS a state-changing request with neither Origin nor Referer", () => {
    const d = checkCsrf(req({ host: HOST }));
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("missing Origin and Referer");
  });

  it("REJECTS every mutating verb when the headers are absent", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(checkCsrf(req({ host: HOST }, method)).ok).toBe(false);
    }
  });

  it("REJECTS when there is no Host to compare against", () => {
    const d = checkCsrf(req({ origin: `https://${HOST}` }));
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("missing Host");
  });

  it("REJECTS the literal `null` Origin (sandboxed iframe, file://)", () => {
    const d = checkCsrf(req({ host: HOST, origin: "null" }));
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("null Origin");
  });

  it("REJECTS a malformed Origin instead of ignoring it", () => {
    const d = checkCsrf(req({ host: HOST, origin: "not-a-url" }));
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("malformed Origin");
  });

  it("REJECTS a foreign Origin", () => {
    const d = checkCsrf(req({ host: HOST, origin: "https://evil.example" }));
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("cross-origin Origin");
  });

  it("does NOT fall back to Referer once a bad Origin is present", () => {
    // Origin is the stronger signal; a forged page could set a same-origin
    // Referer while the browser stamps the real (foreign) Origin.
    const d = checkCsrf({
      method: "POST",
      pathname: "/api/projects",
      headers: new Headers({
        host: HOST,
        origin: "https://evil.example",
        referer: `https://${HOST}/projects`,
      }),
    });
    expect(d.ok).toBe(false);
  });

  it("REJECTS a foreign or malformed Referer when there is no Origin", () => {
    expect(checkCsrf(req({ host: HOST, referer: "https://evil.example/x" })).ok).toBe(
      false,
    );
    expect(checkCsrf(req({ host: HOST, referer: "://broken" })).ok).toBe(false);
  });

  it("is not fooled by a host that merely ends with our host", () => {
    const d = checkCsrf(req({ host: HOST, origin: "https://evilroadmap.local:3040" }));
    expect(d.ok).toBe(false);
  });

  it("treats a differing PORT as cross-origin", () => {
    const d = checkCsrf(req({ host: HOST, origin: "https://roadmap.local:3041" }));
    expect(d.ok).toBe(false);
  });
});

describe("checkCsrf — what it lets through", () => {
  it("allows safe methods without any Origin/Referer", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(checkCsrf(req({ host: HOST }, method)).ok).toBe(true);
    }
  });

  it("allows the login bootstrap with no Origin (the one exemption)", () => {
    const d = checkCsrf(req({ host: HOST }, "POST", "/api/auth/login"));
    expect(d.ok).toBe(true);
    expect(d.reason).toContain("exempt");
  });

  it("allows a same-origin Origin, ignoring scheme and case", () => {
    expect(checkCsrf(req({ host: HOST, origin: `https://${HOST}` })).ok).toBe(true);
    expect(checkCsrf(req({ host: HOST, origin: `http://${HOST}` })).ok).toBe(true);
    expect(
      checkCsrf(req({ host: HOST, origin: `https://ROADMAP.local:3040` })).ok,
    ).toBe(true);
  });

  it("allows a same-origin Referer when Origin is absent", () => {
    const d = checkCsrf(req({ host: HOST, referer: `https://${HOST}/projects` }));
    expect(d.ok).toBe(true);
    expect(d.reason).toContain("Referer");
  });

  it("prefers x-forwarded-host over Host (behind the ngrok tunnel)", () => {
    const d = checkCsrf({
      method: "POST",
      pathname: "/api/projects",
      headers: new Headers({
        host: "localhost:3000",
        "x-forwarded-host": "abc123.ngrok-free.app",
        origin: "https://abc123.ngrok-free.app",
      }),
    });
    expect(d.ok).toBe(true);
  });

  it("rejects an Origin matching the internal Host when a forwarded host is set", () => {
    // Once a proxy declares the public host, the internal one is no longer a
    // valid same-origin claim.
    const d = checkCsrf({
      method: "POST",
      pathname: "/api/projects",
      headers: new Headers({
        host: "localhost:3000",
        "x-forwarded-host": "abc123.ngrok-free.app",
        origin: "http://localhost:3000",
      }),
    });
    expect(d.ok).toBe(false);
  });
});

describe("csrfErrorResponse", () => {
  it("is a 403 carrying the canonical Slovak error envelope", async () => {
    const res = csrfErrorResponse({ ok: false, reason: "missing Origin and Referer" });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Požiadavka bola odmietnutá (CSRF kontrola).",
    });
    expect(res.headers.get("x-csrf-reason")).toBe("missing Origin and Referer");
  });
});

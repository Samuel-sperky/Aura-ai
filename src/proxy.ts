// Proxy — Next.js 16's renamed Middleware. Two jobs, neither of them authorization.
//
//  1. CSRF DEFENCE-IN-DEPTH for /api/*: every state-changing request (POST / PUT /
//     PATCH / DELETE) must carry a same-origin Origin or Referer. FAIL-CLOSED —
//     a missing header is a rejection. Only `/api/auth/login` is exempt (it runs
//     before any session exists and carries no ambient cookie authority; it has
//     its own rate limit + lockout). See lib/security/csrf.ts.
//
//  2. OPTIMISTIC AUTH GATE for browser navigations: a page request with no
//     plausibly-valid session cookie is redirected to /login, and an already
//     signed-in visitor sitting on /login is bounced to the app root. This is a
//     UX optimisation so nobody sees an empty shell before a client-side 401.
//
// *** THIS FILE IS NOT AN AUTHORIZATION BOUNDARY. ***
// It only checks that a cookie carries a valid HS256 signature that has not
// expired. It deliberately does NOT touch the database (it runs on every matched
// request, prefetches included). The real decisions are made per endpoint by
// `requireUser()` / `requireRight()` / `requireAdmin()` in src/lib/auth/rbac.ts,
// which revalidate the `app_sessions` row and re-read the user's rights on EVERY
// request. A revoked session still passes this gate and is then rejected by the
// handler — that is by design; never move an access decision in here.
//
// FAIL-CLOSED SECRET: the reference family app reads
// `process.env.SESSION_SECRET || "dev_session_secret_…"`, which lets anyone who
// knows the public default mint a token that passes this gate. That fallback is
// NOT ported: the secret comes from the validated `env` module, which throws at
// boot when it is missing or shorter than 32 characters.

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/lib/env";
import { checkCsrf, csrfErrorResponse } from "@/lib/security/csrf";

const SESSION_COOKIE = "aura_roadmap_session";
const encodedSecret = new TextEncoder().encode(env.SESSION_SECRET);

/** Page paths that never require a session. */
const PUBLIC_PATHS = ["/login"];

/** Signature + expiry only — never a DB lookup (see the file header). */
async function hasPlausibleSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- 1) CSRF gate for the API ---------------------------------------------
  // The matcher routes /api/* here as well. API auth stays per-handler; this is
  // purely the cross-origin rejection.
  if (pathname.startsWith("/api/")) {
    const decision = checkCsrf({
      method: req.method,
      pathname,
      headers: req.headers,
    });
    if (!decision.ok) return csrfErrorResponse(decision);
    return NextResponse.next();
  }

  // --- 2) Optimistic page gate (never applies to /api/*) --------------------
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const authed = await hasPlausibleSession(req);

  if (!isPublic && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Remember where they were headed; /login validates this before using it.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isPublic && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on app pages AND /api/* (so the CSRF gate can see state-changing API
// requests), excluding Next internals, static assets and metadata files.
export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|icon|apple-icon|manifest.webmanifest|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

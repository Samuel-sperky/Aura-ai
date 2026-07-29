// Server-enforced sessions.
//
// STRATEGY
//   * On login we insert a row into `app_sessions` (random UUID id + absolute TTL)
//     and sign a MINIMAL JWT — `{ sid, uid }` and nothing else — with jose/HS256.
//   * The JWT lives in the http-only cookie `aura_roadmap_session`.
//   * EVERY request re-validates: verify the signature/exp, then load the session
//     row and check it exists, belongs to the same user, is not revoked and has
//     not expired.
//
// THE ROW LOOKUP IS THE POINT. Branch A of the family trusts the JWT alone, which
// means logout cannot really log anyone out (a valid unexpired token keeps
// working) and a stolen cookie is usable until it expires. Here a stolen or
// forged-but-signed cookie is worthless the moment the row is revoked, and
// `POST /api/auth/logout` is a real revocation. That is one extra indexed
// primary-key lookup per request — a price worth paying.
//
// NO CLAIMS BEYOND sid/uid: roles and rights are re-read from the DB on every
// request (see rbac.ts), so revoking a right takes effect immediately instead of
// waiting for the token to expire.
//
// SERVER-ONLY (next/headers + DB). Never import from a Client Component.

import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { env, isProduction } from "@/lib/env";
import { query, execute } from "@/lib/db";
import { clientIp } from "@/lib/security/clientIp";

/** The session cookie name (contract #77). */
export const SESSION_COOKIE_NAME = "aura_roadmap_session";

const ALG = "HS256";
// Fail-closed: `env` throws at boot when SESSION_SECRET is missing or < 32 chars.
// There is deliberately no dev fallback anywhere in this app.
const encodedSecret = new TextEncoder().encode(env.SESSION_SECRET);
const TTL_SECONDS = env.SESSION_TTL_SECONDS;

/** One row of `app_sessions`. */
export interface SessionRow {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

/** The validated session as the rest of the server sees it. */
export interface SessionInfo {
  sessionId: string;
  userId: string;
}

interface JwtPayload {
  sid: string;
  uid: string;
}

async function signToken(
  payload: JwtPayload,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(encodedSecret);
}

/** Verify the cookie JWT. Returns null on any failure (bad sig, expired, shape). */
export async function verifySessionToken(
  token: string,
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      algorithms: [ALG],
    });
    if (typeof payload.sid === "string" && typeof payload.uid === "string") {
      return { sid: payload.sid, uid: payload.uid };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a DB-backed session for `userId`, set the signed http-only cookie and
 * return the new session id. IP + User-Agent are captured for the session list /
 * audit — both derived server-side, never from a request body.
 */
export async function createSession(userId: string): Promise<string> {
  const hdrs = await headers();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  const ip = clientIp(hdrs);
  const userAgent = (hdrs.get("user-agent") ?? "").slice(0, 512) || null;

  await execute(
    `INSERT INTO app_sessions (id, user_id, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, userId, expiresAt, ip, userAgent],
  );

  const token = await signToken({ sid: sessionId, uid: userId }, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    // Not readable from document.cookie — an XSS cannot exfiltrate the session.
    httpOnly: true,
    // Not sent on cross-site sub-requests (first CSRF layer; the proxy adds the
    // Origin/Referer check as the second).
    sameSite: "lax",
    path: "/",
    // HTTPS-only in production. Left off in development because the app is served
    // over http://localhost there and a Secure cookie would never be sent.
    secure: isProduction,
    // Both bounds are set and both line up with the JWT `exp` and the
    // app_sessions row, so cookie lifetime can never outlive the server session.
    expires: expiresAt,
    maxAge: TTL_SECONDS,
  });

  return sessionId;
}

/**
 * Read + validate the current session on THIS request. Verifies the JWT, then
 * revalidates the `app_sessions` row (exists / same user / not revoked / not
 * expired). Returns null when any check fails — callers treat that as anonymous.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const rows = await query<SessionRow>(
    `SELECT id, user_id, created_at, expires_at, revoked_at
       FROM app_sessions
      WHERE id = ?`,
    [payload.sid],
  );
  const row = rows[0];
  if (!row) return null;
  // The uid claim must match the row: a token whose user was re-pointed is void.
  if (row.user_id !== payload.uid) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  return { sessionId: row.id, userId: row.user_id };
}

/** Revoke the current session (logout) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await execute(
        "UPDATE app_sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL",
        [payload.sid],
      );
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Revoke every active session of a user (password change, admin reset,
 * deactivation, delete). Pass `exceptSessionId` to keep one alive — used when a
 * user changes their OWN password so the tab they are working in stays signed in.
 *
 * Pure SQL (no cookie access) so the standalone scripts can call it too.
 */
export async function destroyAllSessionsForUser(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const res = exceptSessionId
    ? await execute(
        `UPDATE app_sessions SET revoked_at = NOW()
          WHERE user_id = ? AND id <> ? AND revoked_at IS NULL`,
        [userId, exceptSessionId],
      )
    : await execute(
        `UPDATE app_sessions SET revoked_at = NOW()
          WHERE user_id = ? AND revoked_at IS NULL`,
        [userId],
      );
  return Number(res.affectedRows ?? 0);
}

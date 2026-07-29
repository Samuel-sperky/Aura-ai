// Server-side audit logging.
//
// WHAT GETS LOGGED (spec Q43): every write — create/update/delete on projects,
// work items, checkpoints, decisions, sprints and users — plus login/logout and
// readiness overrides. There is no soft delete in this app, so `audit_log` IS the
// record that something existed and who removed it.
//
// THE ACTOR AND THE IP ARE DERIVED ON THE SERVER (session + request headers).
// They are never read from a request body: a client that can stamp its own audit
// rows can forge the trail that is supposed to hold it accountable.
//
// SCHEMA ENVELOPE: `audit_log` has a fixed column set — user_id, username,
// action, entity, entity_id, old_values (JSON), new_values (JSON), ip, ts. The
// `username` column holds the actor's E-MAIL (the column name is inherited from
// the family baseline; this app has no username concept), which is why the entry
// field below is called `userEmail`. There
// are no columns for severity / detail / meta / user agent, so those optional
// fields are stashed inside `new_values` under the single reserved key `__audit`
// (the pattern the reference family app uses). Call sites that pass only the
// original fields produce byte-identical rows; `GET /api/audit` unwraps the
// envelope and surfaces the fields at the top level of each entry.
//
// BEST-EFFORT BY DESIGN: the whole body is wrapped in try/catch. Auditing must
// never fail the operation it is recording.

import { headers } from "next/headers";
import { execute } from "@/lib/db";
import { clientIp } from "@/lib/security/clientIp";

/** Spoofing-resistant client IP for the current request (see security/clientIp). */
export async function clientIpFromHeaders(): Promise<string> {
  return clientIp(await headers());
}

/** Best-effort User-Agent capture (bounded, never throws). */
async function userAgentFromHeaders(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const ua = hdrs.get("user-agent")?.trim();
    if (!ua) return null;
    return ua.length > 512 ? ua.slice(0, 512) : ua;
  } catch {
    return null;
  }
}

/** Severity of an audited action. */
export type AuditSeverity = "info" | "success" | "warning" | "critical";

/** The reserved key holding the richer context inside `new_values`. */
export const AUDIT_META_KEY = "__audit" as const;

/** Shape stored at `new_values.__audit` (every part optional). */
export interface AuditMetaEnvelope {
  severity?: AuditSeverity;
  detail?: string;
  meta?: unknown;
  userAgent?: string | null;
}

export interface AuditEntry {
  /** Actor id (`app_users.id`); null for a failed login of an unknown e-mail. */
  userId?: string | null;
  /**
   * Actor e-mail — denormalised so the trail survives a user hard delete.
   * Persisted in the `audit_log.username` column (see the schema note above).
   */
  userEmail?: string | null;
  /** Dotted action key, e.g. `login.success`, `project.delete`. */
  action: string;
  /** Table/entity the action touched, e.g. `projects`. */
  entity?: string | null;
  entityId?: string | null;
  /** Row state before the change (create → omit). */
  oldValues?: unknown;
  /** Row state after the change (delete → omit). */
  newValues?: unknown;
  /** Optional severity (defaults to unset = "info" when read back). */
  severity?: AuditSeverity;
  /** Short human-readable note, e.g. the mandatory override reason. */
  detail?: string | null;
  /** Arbitrary JSON-serialisable context. */
  meta?: unknown;
  /** Override the stored IP. Omit to derive it from the request (the safe default). */
  ip?: string | null;
  /** Override the captured User-Agent. Pass null to skip capture. */
  userAgent?: string | null;
}

/**
 * Build the `new_values` payload. The caller's business payload is preserved
 * as-is; the richer context is attached under `__audit` only when present.
 *
 * Exported for the unit tests and for `GET /api/audit`, which reverses it.
 */
export function buildNewValues(
  newValues: unknown,
  envelope: AuditMetaEnvelope,
): unknown {
  const hasEnvelope = Object.values(envelope).some((v) => v !== undefined);
  if (!hasEnvelope) return newValues ?? null;

  const isPlainObject =
    newValues != null &&
    typeof newValues === "object" &&
    !Array.isArray(newValues);

  if (isPlainObject) {
    return {
      ...(newValues as Record<string, unknown>),
      [AUDIT_META_KEY]: envelope,
    };
  }
  if (newValues === undefined || newValues === null) {
    return { [AUDIT_META_KEY]: envelope };
  }
  // Non-object payload (array / primitive): keep it under `value` so nothing is lost.
  return { value: newValues, [AUDIT_META_KEY]: envelope };
}

/**
 * Write one row to `audit_log`. IP + User-Agent come from the request headers
 * unless explicitly overridden.
 *
 * @example
 *   await audit({
 *     userId: user.id, userEmail: user.email,
 *     action: "project.delete", entity: "projects", entityId: id,
 *     oldValues: before, severity: "warning",
 *   });
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const ip = entry.ip !== undefined ? entry.ip : await clientIpFromHeaders();
    const userAgent =
      entry.userAgent !== undefined
        ? entry.userAgent
        : await userAgentFromHeaders();

    const envelope: AuditMetaEnvelope = {};
    if (entry.severity !== undefined) envelope.severity = entry.severity;
    if (entry.detail !== undefined && entry.detail !== null) {
      envelope.detail = entry.detail;
    }
    if (entry.meta !== undefined) envelope.meta = entry.meta;
    if (userAgent != null) envelope.userAgent = userAgent;

    const newValues = buildNewValues(entry.newValues, envelope);

    await execute(
      `INSERT INTO audit_log
         (user_id, username, action, entity, entity_id, old_values, new_values, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId ?? null,
        entry.userEmail ?? null,
        entry.action,
        entry.entity ?? null,
        entry.entityId ?? null,
        entry.oldValues != null ? JSON.stringify(entry.oldValues) : null,
        newValues != null ? JSON.stringify(newValues) : null,
        ip,
      ],
    );
  } catch {
    // Best-effort: auditing must never throw into the caller's request path.
  }
}

/**
 * `audit()` with the actor filled in from the authenticated user — the form
 * almost every handler wants:
 *
 *   await auditAs(user, { action: "project.update", entity: "projects", entityId: id, oldValues, newValues });
 */
export async function auditAs(
  actor: { id: string; email: string },
  entry: Omit<AuditEntry, "userId" | "userEmail">,
): Promise<void> {
  return audit({ ...entry, userId: actor.id, userEmail: actor.email });
}

// In-app notifications.
//
// IN-APP ONLY. There is no e-mail channel, no `email_outbox`, no SMTP sidecar —
// the source app's mailer is out of scope (contract §2.2, §3.2/17-18). A
// notification is a row someone sees in the bell menu; that is the whole
// delivery mechanism.
//
// WRITES happen inside the business transaction that caused them (a decision
// notification cannot exist without its decision, and vice versa), which is why
// every write takes a `SqlRunner`.
//
// READS are always scoped to the CALLER on the server: `user_id = ?` is not
// optional and never comes from the request body. `notifications.user_id` has an
// FK to `app_users` with ON DELETE CASCADE, so ids are validated before insert —
// a missing user would otherwise abort the whole transaction on a foreign key
// error.

import { randomUUID } from "node:crypto";
import { isoOrNull, num } from "@/lib/domain/data";
import type { NotificationDto } from "@/lib/domain/contracts/checkpoints";
import { mutate, rows, type SqlRunner } from "@/lib/domain/checkpoints";

/** Column widths — truncate here rather than letting MariaDB do it silently. */
const MAX_TITLE = 200;
const MAX_BODY = 1000;

function clamp(value: string, max: number): string {
  const s = value.trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export interface NotificationInput {
  userId: string;
  title: string;
  body?: string;
  entityType?: string | null;
  entityId?: string | null;
}

/** Insert one notification. Returns its id. */
export async function createNotification(
  runner: SqlRunner,
  input: NotificationInput,
): Promise<string> {
  const id = randomUUID();
  await mutate(
    runner,
    `INSERT INTO notifications (id, user_id, title, body, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      clamp(input.title, MAX_TITLE),
      clamp(input.body ?? "", MAX_BODY),
      input.entityType ?? null,
      input.entityId ?? null,
    ],
  );
  return id;
}

/**
 * Resolve the recipients of an event and insert one notification each.
 *
 * `candidateUserIds` may contain nulls, duplicates, the actor and ids of deleted
 * users; this function filters all four:
 *   * the ACTOR is dropped — telling people what they just did themselves is
 *     noise, and noise is what makes a bell get ignored,
 *   * ids absent from `app_users` are dropped (they would fail the FK),
 *   * inactive accounts are dropped (nobody is reading that bell).
 *
 * Returns the ids that were actually notified.
 */
export async function notifyUsers(
  runner: SqlRunner,
  args: {
    candidateUserIds: ReadonlyArray<string | null | undefined>;
    actorId: string;
    title: string;
    body?: string;
    entityType?: string | null;
    entityId?: string | null;
  },
): Promise<string[]> {
  const candidates = [
    ...new Set(
      args.candidateUserIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0 && id !== args.actorId,
      ),
    ),
  ];
  if (candidates.length === 0) return [];

  const placeholders = candidates.map(() => "?").join(", ");
  const valid = await rows<{ id: string }>(
    runner,
    `SELECT id FROM app_users WHERE id IN (${placeholders}) AND active = 1`,
    candidates,
  );

  const notified: string[] = [];
  for (const user of valid) {
    await createNotification(runner, {
      userId: user.id,
      title: args.title,
      body: args.body,
      entityType: args.entityType,
      entityId: args.entityId,
    });
    notified.push(user.id);
  }
  return notified;
}

/**
 * Look up an `app_users.id` from a project's free-text `owner` name.
 *
 * `projects.owner` is a display name, not an FK (that is A4's schema decision —
 * the field predates the user table in the source app), while
 * `notifications.user_id` must be a real id. An exact match on an active account
 * is the only mapping that is safe to make automatically; anything fuzzier could
 * send a decision notice to the wrong person.
 */
export async function userIdByDisplayName(
  runner: SqlRunner,
  displayName: string | null | undefined,
): Promise<string | null> {
  const name = (displayName ?? "").trim();
  if (!name) return null;
  const found = await rows<{ id: string }>(
    runner,
    "SELECT id FROM app_users WHERE name = ? AND active = 1 ORDER BY created_at ASC LIMIT 1",
    [name],
  );
  return found[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: Date | string | null;
  created_at: Date | string | null;
}

export function mapNotification(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: isoOrNull(row.read_at),
    createdAt: isoOrNull(row.created_at),
  };
}

/**
 * The caller's own notifications, newest first. `userId` comes from the session,
 * never from the request.
 */
export async function listNotifications(
  runner: SqlRunner,
  args: {
    userId: string;
    unreadOnly: boolean;
    limit: number;
    offset: number;
  },
): Promise<{ items: NotificationDto[]; total: number }> {
  const where = args.unreadOnly
    ? "WHERE user_id = ? AND read_at IS NULL"
    : "WHERE user_id = ?";
  const params = [args.userId];

  const totalRows = await rows<{ n: number | string }>(
    runner,
    `SELECT COUNT(*) AS n FROM notifications ${where}`,
    params,
  );

  const list = await rows<NotificationRow>(
    runner,
    `SELECT id, title, body, entity_type, entity_id, read_at, created_at
       FROM notifications ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, args.limit, args.offset],
  );

  return { items: list.map(mapNotification), total: num(totalRows[0]?.n) };
}

/** How many unread notifications the caller has (the bell badge). */
export async function unreadCount(
  runner: SqlRunner,
  userId: string,
): Promise<number> {
  const res = await rows<{ n: number | string }>(
    runner,
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return num(res[0]?.n);
}

/**
 * Mark the caller's notifications read. `user_id = ?` is part of every statement,
 * so a crafted id list can only ever touch the caller's own rows. Already-read
 * rows are left alone so the original read time survives.
 */
export async function markNotificationsRead(
  runner: SqlRunner,
  args: { userId: string; ids?: ReadonlyArray<string>; all?: boolean },
): Promise<number> {
  if (args.all) {
    return mutate(
      runner,
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND read_at IS NULL`,
      [args.userId],
    );
  }
  const ids = [...new Set((args.ids ?? []).filter(Boolean))];
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(", ");
  return mutate(
    runner,
    `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
    [args.userId, ...ids],
  );
}

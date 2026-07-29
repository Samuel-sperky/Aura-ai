// Worklog domain layer — OPTIONAL time tracking.
//
// The source app made a worklog mandatory before an item could be finished; this
// port deliberately drops that rule (contract §5.2). Nothing in the work-item or
// sprint flow requires a worklog: it is entered inline in the item detail with
// quick +15/+30/+60 buttons (spec Q30) and only ever adds information.
//
// `work_items.logged_minutes` is a CACHE of SUM(worklogs.minutes) for the item.
// It is recomputed from the rows after every insert/delete rather than
// incremented, so a failed request can never leave the cache drifting.
//
// The cache refresh deliberately does NOT bump `work_items.version`: logging time
// is not an edit of the item, and bumping it would make an open edit form of a
// colleague fail with a spurious 409.

import { randomUUID } from "node:crypto";
import { query, execute } from "@/lib/db";
import { dateOrNull, isoOrNull, num, strOrNull } from "@/lib/domain/data";
import type { WorklogDto } from "@/lib/domain/contracts/workItems";

/** Today as `YYYY-MM-DD` in the app's timezone (the worklog date default). */
export function todayIso(timeZone = "Europe/Bratislava"): string {
  // "sv-SE" formats as YYYY-MM-DD, which is exactly the DATE literal we need.
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(new Date());
}

export interface WorklogRow {
  id: string;
  work_item_id: string;
  user_id: string;
  project_id: string;
  work_date: unknown;
  minutes: number;
  description: string | null;
  created_at: unknown;
  work_item_title: string | null;
  user_name: string | null;
}

export const WORKLOG_SELECT = `
  SELECT wl.id, wl.work_item_id, wl.user_id, wl.project_id, wl.work_date,
         wl.minutes, wl.description, wl.created_at,
         w.title AS work_item_title,
         u.name AS user_name
    FROM worklogs wl
    JOIN work_items w ON w.id = wl.work_item_id
    LEFT JOIN app_users u ON u.id = wl.user_id`;

export function toWorklogDto(row: WorklogRow): WorklogDto {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    workItemTitle: strOrNull(row.work_item_title),
    userId: row.user_id,
    userName: strOrNull(row.user_name),
    projectId: row.project_id,
    workDate: dateOrNull(row.work_date),
    minutes: num(row.minutes),
    description: row.description ?? "",
    createdAt: isoOrNull(row.created_at),
  };
}

/** Load one worklog as a DTO (null when it does not exist). */
export async function loadWorklogDto(id: string): Promise<WorklogDto | null> {
  const rows = await query<WorklogRow>(`${WORKLOG_SELECT} WHERE wl.id = ?`, [id]);
  return rows[0] ? toWorklogDto(rows[0]) : null;
}

/** The bare row a delete needs in order to authorise and audit itself. */
export interface WorklogBase {
  id: string;
  work_item_id: string;
  user_id: string;
  project_id: string;
  minutes: number;
}

export async function loadWorklogBase(id: string): Promise<WorklogBase | null> {
  const rows = await query<WorklogBase>(
    "SELECT id, work_item_id, user_id, project_id, minutes FROM worklogs WHERE id = ?",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Insert a worklog. `project_id` is denormalised from the work item so per-project
 * time reports do not have to join through `work_items`.
 */
export async function insertWorklog(input: {
  workItemId: string;
  userId: string;
  projectId: string;
  workDate: string;
  minutes: number;
  description: string;
}): Promise<string> {
  const id = randomUUID();
  await execute(
    `INSERT INTO worklogs
       (id, work_item_id, user_id, project_id, work_date, minutes, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workItemId,
      input.userId,
      input.projectId,
      input.workDate,
      input.minutes,
      input.description,
    ],
  );
  return id;
}

/**
 * Recompute `work_items.logged_minutes` from the worklog rows. Idempotent, and
 * safe to call after any worklog change. Returns the stored total.
 */
export async function recomputeLoggedMinutes(workItemId: string): Promise<number> {
  const rows = await query<{ total: number }>(
    "SELECT COALESCE(SUM(minutes), 0) AS total FROM worklogs WHERE work_item_id = ?",
    [workItemId],
  );
  const total = num(rows[0]?.total);
  await execute("UPDATE work_items SET logged_minutes = ? WHERE id = ?", [
    total,
    workItemId,
  ]);
  return total;
}

/** Sum of logged minutes for a whole project (reporting helper). */
export async function projectLoggedMinutes(projectId: string): Promise<number> {
  const rows = await query<{ total: number }>(
    "SELECT COALESCE(SUM(minutes), 0) AS total FROM worklogs WHERE project_id = ?",
    [projectId],
  );
  return num(rows[0]?.total);
}

// Work-item domain layer: row → DTO mapping, the hierarchy and dependency rules,
// story-point roll-up and the compare-and-swap writer.
//
// SERVER-ONLY (imports lib/db). The pure functions at the top have no DB or
// framework dependency and carry the business rules the unit tests pin down:
//
//   * effectiveStoryPoints / rollupStoryPoints  — a parent's points are the SUM
//     of its subtasks when it has any, otherwise its own value (spec Q26).
//   * parentPlacementError                     — the TWO-LEVEL limit. A subtask
//     can never get a subtask; the third level is refused with 400.
//   * wouldCreateCycle                         — `blocks` dependencies must stay
//     acyclic (there is only this one relation type, no lag days).
//   * sortBacklog / BACKLOG_ORDER_BY           — manual `rank_value` ascending,
//     `priority` as the tie-break (spec Q27). There are NO weighted priority
//     scores in this app.
//
// Every query is parameterized; the only interpolated SQL fragments come from
// closed allow-lists in this file (sort columns, updatable columns).

import { randomUUID } from "node:crypto";
import { query, execute, withTransaction } from "@/lib/db";
import {
  dateOrNull,
  isoOrNull,
  num,
  round,
  strOrNull,
  escapeLike,
  LIKE_ESCAPE_CLAUSE,
  pickSort,
  sortDir,
} from "@/lib/domain/data";
import {
  PRIORITIES,
  type Priority,
  type WorkItemDto,
  type WorkItemStatus,
  type WorkItemType,
  type WorkItemCommentDto,
  type DependencyRefDto,
} from "@/lib/domain/contracts/workItems";

// ---------------------------------------------------------------------------
// Pure: story points (spec Q26)
// ---------------------------------------------------------------------------

/** The minimum shape `effectiveStoryPoints` needs from an item. */
export interface StoryPointed {
  storyPoints: number;
}

/**
 * A parent's effective story points: the sum of its subtasks when it has any,
 * otherwise its own stored value. Displayed as `5 (3+2)`.
 *
 * @example
 *   effectiveStoryPoints({ storyPoints: 8 }, [])                          // 8
 *   effectiveStoryPoints({ storyPoints: 8 }, [{ storyPoints: 3 }, { storyPoints: 2 }]) // 5
 */
export function effectiveStoryPoints(
  item: StoryPointed,
  children: ReadonlyArray<StoryPointed> = [],
): number {
  if (children.length === 0) return safePoints(item.storyPoints);
  return children.reduce((sum, c) => sum + safePoints(c.storyPoints), 0);
}

function safePoints(v: unknown): number {
  const n = num(v);
  return n > 0 ? Math.trunc(n) : 0;
}

/**
 * DB counterpart of `effectiveStoryPoints`: the roll-up for one stored item.
 * Returns the parent's own value, the subtask sum and the effective number the
 * UI shows, so a caller can render `5 (3+2)` without a second query.
 */
export async function rollupStoryPoints(parentId: string): Promise<{
  ownStoryPoints: number;
  childStoryPoints: number;
  childCount: number;
  storyPoints: number;
}> {
  const rows = await query<{
    own_points: number;
    child_points: number;
    child_count: number;
  }>(
    `SELECT w.story_points AS own_points,
            (SELECT COALESCE(SUM(c.story_points), 0) FROM work_items c WHERE c.parent_id = w.id) AS child_points,
            (SELECT COUNT(*) FROM work_items c WHERE c.parent_id = w.id) AS child_count
       FROM work_items w
      WHERE w.id = ?`,
    [parentId],
  );
  const row = rows[0];
  if (!row) {
    return { ownStoryPoints: 0, childStoryPoints: 0, childCount: 0, storyPoints: 0 };
  }
  const own = safePoints(row.own_points);
  const childPoints = safePoints(row.child_points);
  const childCount = num(row.child_count);
  return {
    ownStoryPoints: own,
    childStoryPoints: childPoints,
    childCount,
    storyPoints: childCount > 0 ? childPoints : own,
  };
}

// ---------------------------------------------------------------------------
// Pure: the TWO-LEVEL hierarchy rule (spec Q25)
// ---------------------------------------------------------------------------

/** What the rule needs to know about the candidate parent. */
export interface ParentCandidate {
  id: string;
  /** The parent's OWN parent. Non-null means it is already a subtask. */
  parentId: string | null;
  projectId: string;
}

export interface ParentPlacement {
  /** Id of the item being (re)parented; empty string when it is being created. */
  childId: string;
  childProjectId: string;
  /** True when the item already has subtasks — it can never become one itself. */
  childHasChildren: boolean;
  /** The loaded parent row, or null when the requested parent does not exist. */
  parent: ParentCandidate | null;
}

/**
 * Validate a `parent_id` assignment. Returns a Slovak error message, or null
 * when the placement is allowed. The API turns a message into a 400.
 *
 * The rule is HARD: exactly two levels. Both directions are covered — a subtask
 * cannot receive children, and an item that already has children cannot be
 * pushed under a parent.
 */
export function parentPlacementError(input: ParentPlacement): string | null {
  const { childId, childProjectId, childHasChildren, parent } = input;

  if (!parent) return "Nadradená položka neexistuje.";
  if (childId && parent.id === childId) {
    return "Položka nemôže byť nadradená sama sebe.";
  }
  if (parent.parentId !== null) {
    return "Podúloha nemôže mať vlastnú podúlohu — hierarchia má najviac 2 úrovne.";
  }
  if (childHasChildren) {
    return "Položka s podúlohami sa nedá zaradiť pod inú položku — hierarchia má najviac 2 úrovne.";
  }
  if (parent.projectId !== childProjectId) {
    return "Nadradená položka musí byť v tom istom projekte.";
  }
  return null;
}

/** Load the parent + child facts and run `parentPlacementError` against them. */
export async function validateParentPlacement(input: {
  parentId: string;
  childId?: string;
  childProjectId: string;
}): Promise<string | null> {
  const parents = await query<{
    id: string;
    parent_id: string | null;
    project_id: string;
  }>("SELECT id, parent_id, project_id FROM work_items WHERE id = ?", [
    input.parentId,
  ]);
  const parentRow = parents[0];

  let childHasChildren = false;
  if (input.childId) {
    const kids = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM work_items WHERE parent_id = ?",
      [input.childId],
    );
    childHasChildren = num(kids[0]?.n) > 0;
  }

  return parentPlacementError({
    childId: input.childId ?? "",
    childProjectId: input.childProjectId,
    childHasChildren,
    parent: parentRow
      ? {
          id: parentRow.id,
          parentId: parentRow.parent_id,
          projectId: parentRow.project_id,
        }
      : null,
  });
}

/**
 * Validate every foreign key a create/update touches, so the user gets a Slovak
 * 400 instead of a raw FK violation turning into a 500. Also enforces that the
 * sprint and the checkpoint belong to the item's own project — the DB cannot
 * express that constraint.
 *
 * Returns a Slovak error message, or null when everything resolves.
 */
export async function relationError(input: {
  projectId: string;
  sprintId?: string | null;
  checkpointId?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
}): Promise<string | null> {
  const projects = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = ?",
    [input.projectId],
  );
  if (!projects[0]) return "Projekt neexistuje.";

  if (input.sprintId) {
    const rows = await query<{ project_id: string }>(
      "SELECT project_id FROM sprints WHERE id = ?",
      [input.sprintId],
    );
    if (!rows[0]) return "Šprint neexistuje.";
    if (rows[0].project_id !== input.projectId) {
      return "Šprint patrí inému projektu.";
    }
  }

  if (input.checkpointId) {
    const rows = await query<{ project_id: string }>(
      "SELECT project_id FROM checkpoints WHERE id = ?",
      [input.checkpointId],
    );
    if (!rows[0]) return "Checkpoint neexistuje.";
    if (rows[0].project_id !== input.projectId) {
      return "Checkpoint patrí inému projektu.";
    }
  }

  for (const [id, label] of [
    [input.assigneeId, "Priradený používateľ neexistuje."],
    [input.reporterId, "Nahlasujúci používateľ neexistuje."],
  ] as const) {
    if (!id) continue;
    const rows = await query<{ id: string }>(
      "SELECT id FROM app_users WHERE id = ?",
      [id],
    );
    if (!rows[0]) return label;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pure: dependency cycles (`blocks` only)
// ---------------------------------------------------------------------------

/** A `blocks` edge: `sourceId` blocks `targetId`. */
export interface DependencyEdge {
  sourceId: string;
  targetId: string;
}

/**
 * Would adding `candidate` to `edges` create a cycle in the `blocks` graph?
 * A self-edge counts as a cycle; otherwise we walk forward from the candidate's
 * target and look for a path back to its source.
 *
 * @example
 *   wouldCreateCycle([{ sourceId: "b", targetId: "a" }], { sourceId: "a", targetId: "b" }) // true
 */
export function wouldCreateCycle(
  edges: ReadonlyArray<DependencyEdge>,
  candidate: DependencyEdge,
): boolean {
  if (candidate.sourceId === candidate.targetId) return true;

  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    const list = outgoing.get(e.sourceId);
    if (list) list.push(e.targetId);
    else outgoing.set(e.sourceId, [e.targetId]);
  }

  const seen = new Set<string>();
  const stack = [candidate.targetId];
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (node === candidate.sourceId) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of outgoing.get(node) ?? []) stack.push(next);
  }
  return false;
}

/** All `blocks` edges whose source lives in the given project. */
export async function dependencyEdgesForProject(
  projectId: string,
): Promise<DependencyEdge[]> {
  const rows = await query<{ source_id: string; target_id: string }>(
    `SELECT d.source_id, d.target_id
       FROM work_item_dependencies d
       JOIN work_items s ON s.id = d.source_id
      WHERE s.project_id = ?`,
    [projectId],
  );
  return rows.map((r) => ({ sourceId: r.source_id, targetId: r.target_id }));
}

// ---------------------------------------------------------------------------
// Pure: backlog ordering (spec Q27)
// ---------------------------------------------------------------------------

/** Numeric weight of a priority for sorting (P1 first). */
export function priorityRank(priority: string): number {
  const i = (PRIORITIES as ReadonlyArray<string>).indexOf(priority);
  return i === -1 ? PRIORITIES.length : i;
}

/** The canonical ORDER BY for a backlog listing. Mirrors `sortBacklog`. */
export const BACKLOG_ORDER_BY = "w.rank_value ASC, w.priority ASC, w.created_at ASC";

/**
 * Default backlog order: manual `rankValue` ascending, then `priority`, then the
 * creation time so the sort is total (and therefore stable across pages).
 */
export function sortBacklog<
  T extends { rankValue: number; priority: string; createdAt?: string | null },
>(items: ReadonlyArray<T>): T[] {
  return [...items].sort((a, b) => {
    if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
    const p = priorityRank(a.priority) - priorityRank(b.priority);
    if (p !== 0) return p;
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  });
}

// ---------------------------------------------------------------------------
// Rows, SELECT and DTO mapping
// ---------------------------------------------------------------------------

export interface WorkItemRow {
  id: string;
  project_id: string;
  sprint_id: string | null;
  checkpoint_id: string | null;
  parent_id: string | null;
  item_type: string;
  title: string;
  description: string | null;
  status: string;
  status_category: string;
  priority: string;
  story_points: number;
  rank_value: number;
  assignee_id: string | null;
  reporter_id: string | null;
  due_date: unknown;
  logged_minutes: number;
  version: number;
  created_at: unknown;
  updated_at: unknown;
  created_by: string | null;
  updated_by: string | null;
  // joined / derived
  project_code: string | null;
  project_name: string | null;
  sprint_name: string | null;
  assignee_name: string | null;
  assignee_initials: string | null;
  reporter_name: string | null;
  child_count: number;
  child_points: number;
}

/**
 * The one SELECT every work-item read goes through. Append ` WHERE …` and an
 * ORDER BY. The two correlated subqueries carry the story-point roll-up so the
 * DTO never needs a follow-up query.
 */
export const WORK_ITEM_SELECT = `
  SELECT w.id, w.project_id, w.sprint_id, w.checkpoint_id, w.parent_id,
         w.item_type, w.title, w.description, w.status, w.status_category,
         w.priority, w.story_points, w.rank_value, w.assignee_id, w.reporter_id,
         w.due_date, w.logged_minutes, w.version, w.created_at, w.updated_at,
         w.created_by, w.updated_by,
         p.code AS project_code, p.name AS project_name,
         s.name AS sprint_name,
         a.name AS assignee_name, a.initials AS assignee_initials,
         rep.name AS reporter_name,
         (SELECT COUNT(*) FROM work_items c WHERE c.parent_id = w.id) AS child_count,
         (SELECT COALESCE(SUM(c.story_points), 0) FROM work_items c WHERE c.parent_id = w.id) AS child_points
    FROM work_items w
    JOIN projects p ON p.id = w.project_id
    LEFT JOIN sprints s ON s.id = w.sprint_id
    LEFT JOIN app_users a ON a.id = w.assignee_id
    LEFT JOIN app_users rep ON rep.id = w.reporter_id`;

/** Map a joined row to the wire DTO (applies the story-point roll-up). */
export function toWorkItemDto(row: WorkItemRow): WorkItemDto {
  const own = safePoints(row.story_points);
  const childPoints = safePoints(row.child_points);
  const childCount = num(row.child_count);
  return {
    id: row.id,
    projectId: row.project_id,
    projectCode: strOrNull(row.project_code),
    projectName: strOrNull(row.project_name),
    sprintId: row.sprint_id,
    sprintName: strOrNull(row.sprint_name),
    checkpointId: row.checkpoint_id,
    parentId: row.parent_id,
    itemType: row.item_type as WorkItemType,
    title: row.title,
    description: strOrNull(row.description),
    status: row.status as WorkItemStatus,
    statusCategory: row.status_category as WorkItemStatus,
    priority: row.priority as Priority,
    storyPoints: childCount > 0 ? childPoints : own,
    ownStoryPoints: own,
    childStoryPoints: childPoints,
    childCount,
    rankValue: num(row.rank_value),
    assigneeId: row.assignee_id,
    assigneeName: strOrNull(row.assignee_name),
    assigneeInitials: strOrNull(row.assignee_initials),
    reporterId: row.reporter_id,
    reporterName: strOrNull(row.reporter_name),
    dueDate: dateOrNull(row.due_date),
    loggedMinutes: num(row.logged_minutes),
    version: num(row.version),
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
  };
}

/** Load one item as a DTO (null when it does not exist). */
export async function loadWorkItemDto(id: string): Promise<WorkItemDto | null> {
  const rows = await query<WorkItemRow>(`${WORK_ITEM_SELECT} WHERE w.id = ?`, [id]);
  return rows[0] ? toWorkItemDto(rows[0]) : null;
}

/** The raw stored row — what the CAS writers compare against. */
export interface WorkItemBase {
  id: string;
  project_id: string;
  sprint_id: string | null;
  parent_id: string | null;
  status: string;
  status_category: string;
  priority: string;
  story_points: number;
  rank_value: number;
  assignee_id: string | null;
  version: number;
}

export const WORK_ITEM_BASE_COLUMNS =
  "id, project_id, sprint_id, parent_id, status, status_category, priority, story_points, rank_value, assignee_id, version";

/** Load the bare row for a write path (no joins, no roll-up). */
export async function loadWorkItemBase(id: string): Promise<WorkItemBase | null> {
  const rows = await query<WorkItemBase>(
    `SELECT ${WORK_ITEM_BASE_COLUMNS} FROM work_items WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Sorting allow-list for the list endpoint
// ---------------------------------------------------------------------------

export const WORK_ITEM_SORT_COLUMNS: Readonly<Record<string, string>> = {
  rank: "w.rank_value",
  priority: "w.priority",
  title: "w.title",
  status: "w.status",
  dueDate: "w.due_date",
  storyPoints: "w.story_points",
  updatedAt: "w.updated_at",
  createdAt: "w.created_at",
};

/**
 * Resolve the ORDER BY for a list request. Without an explicit sort the backlog
 * order wins (`rank_value`, then `priority`) — spec Q27.
 */
export function workItemOrderBy(
  sort: string | undefined,
  dir: string | undefined,
): string {
  if (!sort) return BACKLOG_ORDER_BY;
  const col = pickSort(sort, WORK_ITEM_SORT_COLUMNS, "w.rank_value");
  return `${col} ${sortDir(dir)}, w.id ASC`;
}

/** Build the `title`/`description` search predicate + its bound params. */
export function workItemSearchClause(term: string): {
  clause: string;
  params: string[];
} {
  const like = `%${escapeLike(term)}%`;
  return {
    clause: `(w.title LIKE ? ${LIKE_ESCAPE_CLAUSE} OR w.description LIKE ? ${LIKE_ESCAPE_CLAUSE})`,
    params: [like, like],
  };
}

// ---------------------------------------------------------------------------
// Writes — compare-and-swap on `version`
// ---------------------------------------------------------------------------

/**
 * Columns a CAS update may touch. Column names are interpolated into the SET
 * clause, so this allow-list is the injection barrier: anything not listed here
 * is dropped before the SQL is built.
 */
const UPDATABLE_COLUMNS: ReadonlySet<string> = new Set([
  "sprint_id",
  "checkpoint_id",
  "parent_id",
  "item_type",
  "title",
  "description",
  "status",
  "status_category",
  "priority",
  "story_points",
  "rank_value",
  "assignee_id",
  "reporter_id",
  "due_date",
]);

export interface CasResult {
  ok: boolean;
  /** The version now stored — what a 409 reports back to the client. */
  currentVersion: number;
}

/**
 * Update a work item under optimistic concurrency: the UPDATE only matches when
 * the stored `version` still equals `expectedVersion`, and bumps it by one.
 * Returns `ok: false` plus the version actually stored on a conflict.
 */
export async function casUpdateWorkItem(
  id: string,
  expectedVersion: number,
  sets: Readonly<Record<string, unknown>>,
  updatedBy: string,
): Promise<CasResult> {
  const cols = Object.keys(sets).filter((c) => UPDATABLE_COLUMNS.has(c));
  const assignments = cols.map((c) => `\`${c}\` = ?`);
  const params: unknown[] = cols.map((c) => sets[c]);

  assignments.push("`updated_by` = ?", "`updated_at` = CURRENT_TIMESTAMP", "`version` = `version` + 1");
  params.push(updatedBy, id, expectedVersion);

  const res = await execute(
    `UPDATE work_items SET ${assignments.join(", ")} WHERE id = ? AND version = ?`,
    params,
  );
  if (res.affectedRows > 0) return { ok: true, currentVersion: expectedVersion + 1 };

  const rows = await query<{ version: number }>(
    "SELECT version FROM work_items WHERE id = ?",
    [id],
  );
  return { ok: false, currentVersion: num(rows[0]?.version) };
}

/** Next free `rank_value` in a project (appends to the end, leaving gaps). */
export async function nextRankValue(projectId: string): Promise<number> {
  const rows = await query<{ next_rank: number }>(
    "SELECT COALESCE(MAX(rank_value), 0) + 10 AS next_rank FROM work_items WHERE project_id = ?",
    [projectId],
  );
  return num(rows[0]?.next_rank) || 10;
}

/**
 * The ordering bucket a `rank` swap operates inside: same project, same sprint
 * (backlog counts as one bucket) and the same parent. Keyboard `↑/↓` and drag &
 * drop must agree on it.
 */
export async function rankSiblings(
  item: Pick<WorkItemBase, "project_id" | "sprint_id" | "parent_id">,
): Promise<Array<{ id: string; rank_value: number; version: number }>> {
  const conditions = ["w.project_id = ?"];
  const params: unknown[] = [item.project_id];

  if (item.sprint_id === null) conditions.push("w.sprint_id IS NULL");
  else {
    conditions.push("w.sprint_id = ?");
    params.push(item.sprint_id);
  }
  if (item.parent_id === null) conditions.push("w.parent_id IS NULL");
  else {
    conditions.push("w.parent_id = ?");
    params.push(item.parent_id);
  }

  return query<{ id: string; rank_value: number; version: number }>(
    `SELECT w.id, w.rank_value, w.version
       FROM work_items w
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${BACKLOG_ORDER_BY}`,
    params,
  );
}

/** Pure: pick the neighbour to swap with inside an ordered bucket. */
export function neighbourInBucket(
  ordered: ReadonlyArray<{ id: string }>,
  itemId: string,
  direction: "up" | "down",
): string | null {
  const i = ordered.findIndex((r) => r.id === itemId);
  if (i === -1) return null;
  const j = direction === "up" ? i - 1 : i + 1;
  return ordered[j]?.id ?? null;
}

/**
 * One-step reorder: swap `rank_value` with the neighbour above/below inside the
 * bucket. This is the keyboard alternative to drag & drop (spec Q13), so it must
 * work without any client-computed rank arithmetic.
 *
 * Returns `moved: false` when the item is already at the edge of its bucket.
 */
export async function shiftRank(
  item: WorkItemBase,
  expectedVersion: number,
  direction: "up" | "down",
  updatedBy: string,
): Promise<{ moved: boolean; conflict: boolean; currentVersion: number }> {
  const ordered = await rankSiblings(item);
  const neighbourId = neighbourInBucket(ordered, item.id, direction);
  if (!neighbourId) {
    return { moved: false, conflict: false, currentVersion: num(item.version) };
  }
  const neighbour = ordered.find((r) => r.id === neighbourId);
  if (!neighbour) {
    return { moved: false, conflict: false, currentVersion: num(item.version) };
  }

  // Equal ranks would make the swap a no-op, so give the mover a distinct value.
  const itemRank = num(item.rank_value);
  const neighbourRank = num(neighbour.rank_value);
  const [newItemRank, newNeighbourRank] =
    itemRank === neighbourRank
      ? direction === "up"
        ? [neighbourRank - 1, neighbourRank]
        : [neighbourRank + 1, neighbourRank]
      : [neighbourRank, itemRank];

  return withTransaction(async (conn) => {
    const res = (await conn.query(
      `UPDATE work_items SET rank_value = ?, updated_by = ?,
              updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ? AND version = ?`,
      [Math.max(0, newItemRank), updatedBy, item.id, expectedVersion],
    )) as unknown as { affectedRows: number };

    if (!res.affectedRows) {
      const rows = (await conn.query(
        "SELECT version FROM work_items WHERE id = ?",
        [item.id],
      )) as unknown as Array<{ version: number }>;
      return {
        moved: false,
        conflict: true,
        currentVersion: num(rows[0]?.version),
      };
    }

    await conn.query(
      `UPDATE work_items SET rank_value = ?, updated_by = ?,
              updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ?`,
      [Math.max(0, newNeighbourRank), updatedBy, neighbourId],
    );

    return { moved: true, conflict: false, currentVersion: expectedVersion + 1 };
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface CommentRow {
  id: string;
  work_item_id: string;
  author_id: string;
  body: string;
  edited_at: unknown;
  created_at: unknown;
  author_name: string | null;
  author_initials: string | null;
}

export const COMMENT_SELECT = `
  SELECT c.id, c.work_item_id, c.author_id, c.body, c.edited_at, c.created_at,
         u.name AS author_name, u.initials AS author_initials
    FROM work_item_comments c
    LEFT JOIN app_users u ON u.id = c.author_id`;

export function toCommentDto(row: CommentRow): WorkItemCommentDto {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    authorId: row.author_id,
    authorName: strOrNull(row.author_name),
    authorInitials: strOrNull(row.author_initials),
    body: row.body,
    editedAt: isoOrNull(row.edited_at),
    createdAt: isoOrNull(row.created_at),
  };
}

export async function insertComment(input: {
  workItemId: string;
  authorId: string;
  body: string;
}): Promise<string> {
  const id = randomUUID();
  await execute(
    "INSERT INTO work_item_comments (id, work_item_id, author_id, body) VALUES (?, ?, ?, ?)",
    [id, input.workItemId, input.authorId, input.body],
  );
  return id;
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface DependencyRefRow {
  id: string;
  title: string;
  status: string;
  project_id: string;
  created_at: unknown;
}

export function toDependencyRefDto(row: DependencyRefRow): DependencyRefDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status as WorkItemStatus,
    projectId: row.project_id,
    createdAt: isoOrNull(row.created_at),
  };
}

/** Both directions of the `blocks` graph around one item. */
export async function loadDependencies(itemId: string): Promise<{
  blocks: DependencyRefDto[];
  blockedBy: DependencyRefDto[];
}> {
  const blocks = await query<DependencyRefRow>(
    `SELECT w.id, w.title, w.status, w.project_id, d.created_at
       FROM work_item_dependencies d
       JOIN work_items w ON w.id = d.target_id
      WHERE d.source_id = ?
      ORDER BY w.title ASC`,
    [itemId],
  );
  const blockedBy = await query<DependencyRefRow>(
    `SELECT w.id, w.title, w.status, w.project_id, d.created_at
       FROM work_item_dependencies d
       JOIN work_items w ON w.id = d.source_id
      WHERE d.target_id = ?
      ORDER BY w.title ASC`,
    [itemId],
  );
  return {
    blocks: blocks.map(toDependencyRefDto),
    blockedBy: blockedBy.map(toDependencyRefDto),
  };
}

// ---------------------------------------------------------------------------
// Misc helpers shared with the sprint module
// ---------------------------------------------------------------------------

/**
 * `status` and `status_category` are kept 1:1 (the per-project workflow engine of
 * the source app is out of scope), so every writer sets both from one value.
 */
export function statusPair(status: WorkItemStatus): {
  status: WorkItemStatus;
  status_category: WorkItemStatus;
} {
  return { status, status_category: status };
}

/** Percentage helper shared by the sprint metrics (2 decimals, never NaN). */
export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return round((part / whole) * 100, 1);
}

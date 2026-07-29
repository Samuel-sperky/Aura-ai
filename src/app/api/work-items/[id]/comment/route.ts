// GET   /api/work-items/[id]/comment — the item's comments (`work_items.read`)
// POST  /api/work-items/[id]/comment — add a comment (`comments.write`)
// PATCH /api/work-items/[id]/comment — edit one (author or admin, `comments.write`)
//
// Editing stamps `edited_at` (the table's stand-in for `updated_at`) and is
// audited with the previous body, so a rewritten comment can still be read back
// from `audit_log`. Comments are never soft-deleted; there is no delete endpoint
// on purpose — a comment thread that silently loses entries is worse than one
// that shows an edited note.

import { defineRoute, notFound } from "@/lib/api/defineRoute";
import { jsonList, jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { isAdmin } from "@/lib/auth/rbac";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { pageMeta, toPagination } from "@/lib/domain/data";
import {
  commentCreateSchema,
  commentListQuerySchema,
  commentUpdateSchema,
} from "@/lib/domain/contracts/workItems";
import {
  COMMENT_SELECT,
  insertComment,
  toCommentDto,
  type CommentRow,
} from "@/lib/domain/workItems";

/** Does the work item exist? Comments are meaningless without their item. */
async function workItemExists(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM work_items WHERE id = ?",
    [id],
  );
  return rows.length > 0;
}

export const GET = defineRoute(
  {
    auth: { right: "work_items.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: commentListQuerySchema,
  },
  async ({ query: q, params }) => {
    const { id } = params as { id: string };
    if (!(await workItemExists(id))) return notFound("Položka neexistuje.");

    const totals = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM work_item_comments WHERE work_item_id = ?",
      [id],
    );
    const total = Number(totals[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<CommentRow>(
      `${COMMENT_SELECT}
        WHERE c.work_item_id = ?
        ORDER BY c.created_at ASC, c.id ASC
        LIMIT ? OFFSET ?`,
      [id, pg.limit, pg.offset],
    );

    return jsonList(rows.map(toCommentDto), pageMeta(pg, total));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "comments.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: commentCreateSchema,
  },
  async ({ user, body, params }) => {
    const { id } = params as { id: string };
    if (!(await workItemExists(id))) return notFound("Položka neexistuje.");

    const commentId = await insertComment({
      workItemId: id,
      authorId: user.id,
      body: body.body,
    });

    const rows = await query<CommentRow>(`${COMMENT_SELECT} WHERE c.id = ?`, [
      commentId,
    ]);
    const comment = rows[0] ? toCommentDto(rows[0]) : null;

    await auditAs(user, {
      action: "work_item_comment.create",
      entity: "work_item_comments",
      entityId: commentId,
      severity: "success",
      newValues: { workItemId: id, body: body.body },
    });

    return jsonOk({ comment }, { status: 201 });
  },
);

export const PATCH = defineRoute(
  {
    auth: { right: "comments.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: commentUpdateSchema,
  },
  async ({ user, body, params }) => {
    const { id } = params as { id: string };

    const existing = await query<{
      id: string;
      author_id: string;
      body: string;
      work_item_id: string;
    }>(
      "SELECT id, author_id, body, work_item_id FROM work_item_comments WHERE id = ? AND work_item_id = ?",
      [body.commentId, id],
    );
    const comment = existing[0];
    if (!comment) return notFound("Komentár neexistuje.");

    // Only the author may rewrite their own words; an admin may moderate.
    if (comment.author_id !== user.id && !isAdmin(user)) {
      return jsonError("Upraviť komentár môže len jeho autor.", 403);
    }

    await execute(
      "UPDATE work_item_comments SET body = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?",
      [body.body, comment.id],
    );

    const rows = await query<CommentRow>(`${COMMENT_SELECT} WHERE c.id = ?`, [
      comment.id,
    ]);

    await auditAs(user, {
      action: "work_item_comment.update",
      entity: "work_item_comments",
      entityId: comment.id,
      severity: "info",
      oldValues: { body: comment.body },
      newValues: { body: body.body, workItemId: id },
    });

    return jsonOk({ comment: rows[0] ? toCommentDto(rows[0]) : null });
  },
);

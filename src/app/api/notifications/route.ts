// GET /api/notifications — the caller's own in-app notifications, newest first.
//
// IN-APP ONLY: no e-mail, no `email_outbox`, no SMTP (contract §2.2). The bell menu
// is the whole delivery channel.
//
// SCOPING IS SERVER-SIDE AND NOT NEGOTIABLE: `user_id` comes from the session, and
// there is no query parameter that can widen it. Notifications quote project and
// checkpoint names, so reading someone else's would leak data the caller may not
// otherwise see.
//
// THE BELL BADGE: this endpoint returns the canonical list envelope only. For the
// unread count, ask for `?unread=1&pageSize=1` and read `pagination.total` — one
// cheap COUNT, and the list shape stays identical on every list route in the app.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList } from "@/lib/api/respond";
import { pageMeta, toPagination } from "@/lib/domain/data";
import { poolRunner } from "@/lib/domain/checkpoints";
import { listNotifications } from "@/lib/domain/notifications";
import { notificationListQuerySchema } from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "notifications.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: notificationListQuerySchema,
  },
  async ({ user, query: q }) => {
    const pg = toPagination(q.page, q.pageSize);
    const { items, total } = await listNotifications(poolRunner, {
      userId: user.id,
      unreadOnly: q.unread === "1",
      limit: pg.limit,
      offset: pg.offset,
    });
    return jsonList(items, pageMeta(pg, total));
  },
);

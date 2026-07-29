// POST /api/notifications/read — mark the caller's notifications as read.
//
// Body is either `{ ids: [...] }` (the ones just seen) or `{ all: true }`
// ("mark all read"). Every statement carries `user_id = <session user>`, so a
// crafted id list can only ever touch the caller's own rows — the ids are a filter,
// never the authorisation.
//
// Gated on `notifications.read`, not on a write right: marking your own bell read is
// not a privileged change, and a Viewer (who holds no write rights at all) must
// still be able to clear their own notifications.
//
// Already-read rows are left untouched so the original read time survives, which is
// why `updated` can be smaller than the number of ids sent.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { poolRunner } from "@/lib/domain/checkpoints";
import {
  markNotificationsRead,
  unreadCount,
} from "@/lib/domain/notifications";
import { notificationsReadSchema } from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const POST = defineRoute(
  {
    auth: { right: "notifications.read" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: notificationsReadSchema,
  },
  async ({ user, body }) => {
    const updated = await markNotificationsRead(poolRunner, {
      userId: user.id,
      ids: body.ids,
      all: body.all === true,
    });
    // Hand the fresh badge value straight back so the bell needs no second call.
    return jsonOk({ updated, unreadCount: await unreadCount(poolRunner, user.id) });
  },
);

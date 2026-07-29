// GET /api/view-preferences/[page] — the last used filter/view state of one page
// PUT /api/view-preferences/[page] — store it (spec Q20)
//
// `page` must be one of the six navigation keys (overview | timeline | projects |
// work-items | decisions | settings) — anything else is a 404, so a typo cannot
// silently create a junk row.
//
// The config is a per-page document. Known keys are typed in `viewConfigSchema`,
// unknown keys pass through (a page may remember something this contract has not
// anticipated) with the SERIALIZED SIZE capped instead — that is the property
// that actually needs enforcing on a JSON column.
//
// Filters also live in the URL (`nuqs`); this store is only what the page falls
// back to when opened without query params. Not audited (see /api/preferences).

import { defineRoute, notFound } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { loadViewPreferences, saveViewPreferences } from "@/lib/domain/projects";
import {
  pageKeySchema,
  viewPreferencesUpdateSchema,
} from "@/lib/domain/contracts/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

const PREFERENCES_RIGHT = { right: "preferences.own" } as const;

/** Validate the dynamic segment against the six page keys. */
function pageKeyOf(params: unknown): string | null {
  const raw = (params as { page?: string }).page;
  const parsed = pageKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const GET = defineRoute(
  { auth: PREFERENCES_RIGHT, rateLimit: RATE_LIMITS.read },
  async ({ user, params }) => {
    const pageKey = pageKeyOf(params);
    if (!pageKey) return notFound("Neznámy pohľad.");

    const config = await loadViewPreferences(user.id, pageKey);
    return jsonOk({ page: pageKey, config });
  },
);

export const PUT = defineRoute(
  {
    auth: PREFERENCES_RIGHT,
    rateLimit: RATE_LIMITS.write,
    bodySchema: viewPreferencesUpdateSchema,
  },
  async ({ user, body, params }) => {
    const pageKey = pageKeyOf(params);
    if (!pageKey) return notFound("Neznámy pohľad.");

    // Full replace, not a merge: the client owns the whole view state and a
    // merge would make a cleared filter impossible to express.
    await saveViewPreferences(user.id, pageKey, body.config);
    return jsonOk({ page: pageKey, config: body.config });
  },
);

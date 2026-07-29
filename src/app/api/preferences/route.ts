// GET /api/preferences — the signed-in user's theme / density / language
// PUT /api/preferences — patch any subset of them
//
// Gated on `preferences.own`, which EVERY role holds (viewer included): choosing
// your own theme is not a write privilege on the app's data.
//
// These mirror the localStorage keys aura_roadmap_theme / aura_roadmap_density /
// aura_roadmap_lang, so the choice follows the account across devices. The client
// stays authoritative for the pre-paint render (localStorage, no flash); this
// endpoint is the durable copy.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { loadRawPreferences, saveRawPreferences } from "@/lib/domain/projects";
import {
  preferencesUpdateSchema,
  resolvePreferences,
} from "@/lib/domain/contracts/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

const PREFERENCES_RIGHT = { right: "preferences.own" } as const;

export const GET = defineRoute(
  { auth: PREFERENCES_RIGHT, rateLimit: RATE_LIMITS.read },
  async ({ user }) => {
    const raw = await loadRawPreferences(user.id);
    return jsonOk({ preferences: resolvePreferences(raw) });
  },
);

export const PUT = defineRoute(
  {
    auth: PREFERENCES_RIGHT,
    rateLimit: RATE_LIMITS.write,
    bodySchema: preferencesUpdateSchema,
  },
  async ({ user, body }) => {
    const raw = await loadRawPreferences(user.id);
    const current = resolvePreferences(raw);

    // Patch semantics: an omitted field keeps its stored value. Unknown keys that
    // some earlier version stored are dropped by `resolvePreferences`.
    const next = resolvePreferences({ ...current, ...body });
    await saveRawPreferences(user.id, next);

    // NOT audited on purpose: spec Q43 lists the domain entities plus
    // login/logout and readiness overrides. A theme toggle is not a business
    // event, and auditing it would bury the trail it is supposed to keep useful.
    return jsonOk({ preferences: next });
  },
);

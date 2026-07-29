// GET /api/health → { ok, db } — liveness + DB connectivity probe.
//
// PUBLIC by design: the Docker healthcheck and the compose `depends_on` gate call
// it with no session. It leaks nothing beyond "the DB answers SELECT 1".
// Returns 503 (not 200) when the DB is unreachable so the orchestrator restarts
// the container instead of routing traffic to a broken instance.
import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = defineRoute({}, async () => {
  const db = await pingDb();
  return jsonOk({ ok: true, db }, { status: db ? 200 : 503 });
});

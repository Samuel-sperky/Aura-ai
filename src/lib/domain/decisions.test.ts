// The immutability contract of the decision record, end to end over a fake SQL
// runner:
//
//   * `conditional_go` without a follow-up title is refused and writes NOTHING.
//   * A decided checkpoint cannot be decided again — no UPDATE, no second row.
//   * Reopening INSERTs a NEW decision row and stamps the previous one's
//     `superseded_by`; it never edits or deletes the old row.
//   * Deciding writes the checkpoint state, the decision row, the baseline
//     snapshot, the audit row and the notification through the SAME runner, so a
//     transaction commits or rolls back all of them together.
//
// `@/lib/db` is mocked away (no pool, no env validation) and `@/lib/auth/audit` is
// stubbed so importing it does not pull `next/headers` into a plain node test.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

// Mirrors the real envelope helper: extra context is nested under `__audit`.
vi.mock("@/lib/auth/audit", () => ({
  buildNewValues: (newValues: unknown, envelope: Record<string, unknown>) => {
    const hasEnvelope = Object.values(envelope).some((v) => v !== undefined);
    if (!hasEnvelope) return newValues ?? null;
    if (newValues != null && typeof newValues === "object" && !Array.isArray(newValues)) {
      return { ...(newValues as Record<string, unknown>), __audit: envelope };
    }
    return { __audit: envelope };
  },
}));

import {
  decideCheckpoint,
  reopenCheckpoint,
  validateDecisionPayload,
  type DecisionActor,
} from "./decisions";
import type { SqlRunner } from "./checkpoints";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

interface RecordedCall {
  sql: string;
  params: unknown[];
}

interface FakeState {
  guard: {
    id: string;
    project_id: string;
    name: string;
    checkpoint_type: string;
    lifecycle: string;
    owner_id: string | null;
    approver_id: string | null;
    version: number;
    due_date: string | null;
  };
  requiredCount: number;
  requiredComplete: number;
  /** Ids of decision rows currently un-superseded (0 or 1 by invariant). */
  currentDecisionIds: string[];
  /** `UPDATE checkpoints … WHERE version = ?` affected-row count. */
  checkpointUpdateAffects: number;
  projectOwnerName: string | null;
  projectOwnerUserId: string | null;
  knownUserIds: string[];
}

function state(over: Partial<FakeState> = {}): FakeState {
  return {
    guard: {
      id: "cp1",
      project_id: "p1",
      name: "Security gate",
      checkpoint_type: "review",
      lifecycle: "ready",
      owner_id: "u-owner",
      approver_id: "u-approver",
      version: 4,
      due_date: "2026-08-10",
    },
    requiredCount: 2,
    requiredComplete: 2,
    currentDecisionIds: [],
    checkpointUpdateAffects: 1,
    projectOwnerName: "Anna Adamová",
    projectOwnerUserId: "u-project-owner",
    knownUserIds: ["u-owner", "u-approver", "u-project-owner", "u-assignee"],
    ...over,
  };
}

/**
 * A `SqlRunner` that answers each statement the decide / reopen paths issue and
 * records every call. Routing is by distinctive SQL fragments; the ORDER of the
 * rules matters where two statements share a table.
 */
function fakeDb(s: FakeState): SqlRunner & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  return {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });

      // --- the guard row (locked) -------------------------------------------
      if (sql.includes("FROM checkpoints") && sql.includes("FOR UPDATE")) {
        return [s.guard];
      }
      // --- readiness recomputation ------------------------------------------
      if (sql.includes("FROM checkpoint_requirements")) {
        return [
          {
            required_count: s.requiredCount,
            required_complete: s.requiredComplete,
          },
        ];
      }
      // --- notification recipient filtering (before the plain id IN lookup) --
      if (sql.includes("FROM app_users") && sql.includes("active = 1")) {
        if (sql.includes("name = ?")) {
          return s.projectOwnerUserId ? [{ id: s.projectOwnerUserId }] : [];
        }
        const wanted = params.filter((p): p is string => typeof p === "string");
        return wanted
          .filter((id) => s.knownUserIds.includes(id))
          .map((id) => ({ id }));
      }
      // --- FK pre-check for the follow-up assignee --------------------------
      if (sql.includes("FROM app_users WHERE id IN")) {
        const wanted = params.filter((p): p is string => typeof p === "string");
        return wanted
          .filter((id) => s.knownUserIds.includes(id))
          .map((id) => ({ id }));
      }
      // --- currently un-superseded decision rows ----------------------------
      if (sql.includes("SELECT id FROM checkpoint_decisions")) {
        return s.currentDecisionIds.map((id) => ({ id }));
      }
      // --- baseline snapshot reads ------------------------------------------
      if (sql.includes("FROM projects") && sql.includes("area")) {
        return [
          {
            id: "p1",
            code: "AUR",
            name: "Aura",
            area: "Interné",
            status: "on_track",
            health: "green",
            progress: 40,
            owner: s.projectOwnerName ?? "",
            priority: "P2",
            start_date: "2026-07-01",
            end_date: "2026-12-31",
          },
        ];
      }
      if (sql.includes("SELECT owner FROM projects")) {
        return [{ owner: s.projectOwnerName }];
      }
      if (sql.includes("FROM checkpoints WHERE project_id")) {
        // Both the snapshot read and the next-checkpoint refresh land here.
        return [];
      }
      if (sql.includes("FROM sprints WHERE project_id")) return [];
      if (sql.includes("FROM work_items WHERE project_id")) {
        if (sql.includes("next_rank")) return [{ next_rank: 20 }];
        return [];
      }
      // --- the compare-and-swap on the checkpoint ---------------------------
      if (sql.includes("UPDATE checkpoints")) {
        return { affectedRows: s.checkpointUpdateAffects };
      }
      return { affectedRows: 1 };
    },
  };
}

function actor(over: Partial<DecisionActor> = {}): DecisionActor {
  return {
    id: "u-approver",
    email: "approver@aura.sk",
    displayName: "Boris Beňo",
    canOverrideReadiness: false,
    ip: "10.0.0.5",
    userAgent: "vitest",
    ...over,
  };
}

function baseDecide() {
  return {
    checkpointId: "cp1",
    expectedVersion: 4,
    outcome: "go" as const,
    note: "Všetko potvrdené.",
    followUpPriority: "P1" as const,
    actor: actor(),
    today: "2026-08-01",
  };
}

const writes = (calls: RecordedCall[]) =>
  calls.filter(
    (c) =>
      c.sql.startsWith("INSERT") ||
      c.sql.startsWith("UPDATE") ||
      c.sql.startsWith("DELETE") ||
      c.sql.includes("UPDATE checkpoints"),
  );

const find = (calls: RecordedCall[], fragment: string) =>
  calls.filter((c) => c.sql.includes(fragment));

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

describe("validateDecisionPayload", () => {
  it("refuses `conditional_go` with no follow-up title", () => {
    const rejection = validateDecisionPayload({ outcome: "conditional_go" });
    expect(rejection?.status).toBe(400);
    expect(rejection?.code).toBe("FOLLOW_UP_REQUIRED");
  });

  it("refuses `conditional_go` with a whitespace-only follow-up title", () => {
    expect(
      validateDecisionPayload({ outcome: "conditional_go", followUpTitle: "   " })
        ?.code,
    ).toBe("FOLLOW_UP_REQUIRED");
  });

  it("accepts `conditional_go` with a follow-up title", () => {
    expect(
      validateDecisionPayload({
        outcome: "conditional_go",
        followUpTitle: "Doplniť penetračný test",
      }),
    ).toBeNull();
  });

  it.each(["go", "no_go", "deferred"] as const)(
    "does not require a follow-up for %s",
    (outcome) => {
      expect(validateDecisionPayload({ outcome })).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// decideCheckpoint
// ---------------------------------------------------------------------------

describe("decideCheckpoint", () => {
  it("writes state, decision, baseline, notification and audit through one runner", async () => {
    const s = state();
    const db = fakeDb(s);
    const result = await decideCheckpoint(db, baseDecide());

    expect(result).not.toHaveProperty("status");
    if ("status" in result) throw new Error("expected success");

    expect(result.lifecycle).toBe("decided");
    expect(result.readiness).toBe(100);
    expect(result.override).toBe(false);
    // Optimistic concurrency: the caller's version + 1.
    expect(result.version).toBe(5);

    const cpUpdate = find(db.calls, "UPDATE checkpoints");
    expect(cpUpdate).toHaveLength(1);
    expect(cpUpdate[0].sql).toContain("lifecycle = 'decided'");
    // The compare-and-swap binds the EXPECTED version, not the new one.
    expect(cpUpdate[0].params).toEqual([100, "u-approver", "cp1", 4]);

    const decisionInsert = find(db.calls, "INSERT INTO checkpoint_decisions");
    expect(decisionInsert).toHaveLength(1);
    expect(decisionInsert[0].params).toEqual([
      result.decisionId,
      "cp1",
      "go",
      "Všetko potvrdené.",
      "u-approver",
    ]);

    expect(find(db.calls, "INSERT INTO plan_versions")).toHaveLength(1);
    expect(result.planVersionId).toBeTruthy();

    // Notified: the project owner (spec Q37c) plus the checkpoint's own owner.
    // The actor is never notified of their own act.
    expect(result.notifiedUserIds).toEqual(["u-project-owner", "u-owner"]);
    expect(result.notifiedUserIds).not.toContain("u-approver");
    expect(find(db.calls, "INSERT INTO notifications")).toHaveLength(2);

    const audit = find(db.calls, "INSERT INTO audit_log");
    expect(audit).toHaveLength(1);
    expect(audit[0].params[2]).toBe("checkpoint.decide");
    // IP is the server-derived value handed in by the route, never a body field.
    expect(audit[0].params[7]).toBe("10.0.0.5");

    // No follow-up item for a plain `go`.
    expect(find(db.calls, "INSERT INTO work_items")).toHaveLength(0);
  });

  it("refuses `conditional_go` with no follow-up title and writes nothing", async () => {
    const db = fakeDb(state());
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      outcome: "conditional_go",
      followUpTitle: null,
    });

    expect(result).toMatchObject({ status: 400, code: "FOLLOW_UP_REQUIRED" });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("creates the follow-up work item for `conditional_go`", async () => {
    const db = fakeDb(state());
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      outcome: "conditional_go",
      followUpTitle: "Doplniť penetračný test",
      followUpAssigneeId: "u-assignee",
    });
    if ("status" in result) throw new Error("expected success");

    const items = find(db.calls, "INSERT INTO work_items");
    expect(items).toHaveLength(1);
    expect(result.followUpItemId).toBeTruthy();
    // The item is linked to the checkpoint and ranked at the end of the backlog.
    expect(items[0].params).toContain("cp1");
    expect(items[0].params).toContain("Doplniť penetračný test");
    expect(items[0].params).toContain("u-assignee");
    expect(items[0].params).toContain(20);
  });

  it("refuses a decision below 100 % readiness and writes nothing", async () => {
    const db = fakeDb(state({ requiredComplete: 1 }));
    const result = await decideCheckpoint(db, baseDecide());

    expect(result).toMatchObject({ status: 422, code: "NOT_READY" });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("records a second audit row when the 100 % rule is overridden", async () => {
    const db = fakeDb(state({ requiredComplete: 1 }));
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      actor: actor({ canOverrideReadiness: true }),
      overrideReason: "Externý audit doručil výsledok mimo systému.",
    });
    if ("status" in result) throw new Error("expected success");

    expect(result.override).toBe(true);
    expect(result.readiness).toBe(50);
    const audit = find(db.calls, "INSERT INTO audit_log");
    expect(audit.map((c) => c.params[2])).toEqual([
      "checkpoint.decide",
      "readiness.override",
    ]);
    // The mandatory reason travels into the audit envelope, not into a bare column.
    expect(String(audit[1].params[6])).toContain(
      "Externý audit doručil výsledok mimo systému.",
    );
  });

  it("cannot overwrite an existing decision", async () => {
    // The immutability rule (spec Q36): a decided checkpoint is refused outright.
    // There is no code path, and no route, that edits a checkpoint_decisions row.
    const decided = state({ currentDecisionIds: ["d-existing"] });
    decided.guard.lifecycle = "decided";
    const db = fakeDb(decided);

    const result = await decideCheckpoint(db, baseDecide());
    expect(result).toMatchObject({ status: 409, code: "ALREADY_DECIDED" });
    expect(writes(db.calls)).toHaveLength(0);
    expect(find(db.calls, "UPDATE checkpoint_decisions")).toHaveLength(0);
    expect(find(db.calls, "INSERT INTO checkpoint_decisions")).toHaveLength(0);
  });

  it("supersedes the previous decision row instead of updating it", async () => {
    // Reached after a reopen: the `deferred` marker is the current row and the new
    // decision must push it into the history.
    const db = fakeDb(state({ currentDecisionIds: ["d-reopen-marker"] }));
    const result = await decideCheckpoint(db, baseDecide());
    if ("status" in result) throw new Error("expected success");

    expect(result.supersededDecisionIds).toEqual(["d-reopen-marker"]);
    const supersede = find(db.calls, "UPDATE checkpoint_decisions");
    expect(supersede).toHaveLength(1);
    expect(supersede[0].sql).toContain("SET superseded_by = ?");
    expect(supersede[0].params).toEqual([
      result.decisionId,
      "cp1",
      result.decisionId,
    ]);
  });

  it("returns 409 with the current version on a stale version", async () => {
    const db = fakeDb(state());
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      expectedVersion: 2,
    });
    expect(result).toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
      currentVersion: 4,
    });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("returns 409 when the compare-and-swap loses the race", async () => {
    const db = fakeDb(state({ checkpointUpdateAffects: 0 }));
    const result = await decideCheckpoint(db, baseDecide());
    expect(result).toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
    // The UPDATE ran but matched nothing; nothing after it may have run.
    expect(find(db.calls, "INSERT INTO checkpoint_decisions")).toHaveLength(0);
  });

  it("returns 404 for a checkpoint that does not exist", async () => {
    const db: SqlRunner & { calls: RecordedCall[] } = {
      calls: [],
      async query() {
        return [];
      },
    };
    const result = await decideCheckpoint(db, baseDecide());
    expect(result).toMatchObject({ status: 404 });
  });

  it("refuses anyone who is not the named approver", async () => {
    const db = fakeDb(state());
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      actor: actor({ id: "u-owner", canOverrideReadiness: true }),
    });
    expect(result).toMatchObject({ status: 403, code: "NOT_APPROVER" });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("refuses a `gate` decided by its own owner", async () => {
    const s = state();
    s.guard.checkpoint_type = "gate";
    s.guard.owner_id = "u-approver";
    const db = fakeDb(s);
    const result = await decideCheckpoint(db, baseDecide());
    expect(result).toMatchObject({ status: 422, code: "GATE_SAME_PERSON" });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("refuses an unknown follow-up assignee before touching anything", async () => {
    const db = fakeDb(state());
    const result = await decideCheckpoint(db, {
      ...baseDecide(),
      outcome: "conditional_go",
      followUpTitle: "Doplniť test",
      followUpAssigneeId: "u-ghost",
    });
    expect(result).toMatchObject({ status: 400, code: "UNKNOWN_ASSIGNEE" });
    expect(writes(db.calls)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// reopenCheckpoint
// ---------------------------------------------------------------------------

describe("reopenCheckpoint", () => {
  function decidedState(over: Partial<FakeState> = {}) {
    const s = state({ currentDecisionIds: ["d-old"], ...over });
    s.guard.lifecycle = "decided";
    return s;
  }

  it("inserts a NEW decision row and supersedes the old one", async () => {
    const db = fakeDb(decidedState());
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Zmenil sa rozsah dodávky, treba rozhodnúť znova.",
      actor: actor({ canOverrideReadiness: true }),
    });
    if ("status" in result) throw new Error("expected success");

    // A brand new row carrying the reason — the old one is untouched apart from
    // the single `superseded_by` stamp.
    const inserts = find(db.calls, "INSERT INTO checkpoint_decisions");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].sql).toContain("'deferred'");
    expect(inserts[0].params).toEqual([
      result.decisionId,
      "cp1",
      "Zmenil sa rozsah dodávky, treba rozhodnúť znova.",
      "u-approver",
    ]);

    const supersede = find(db.calls, "UPDATE checkpoint_decisions");
    expect(supersede).toHaveLength(1);
    expect(supersede[0].sql).toContain("SET superseded_by = ?");
    expect(supersede[0].params[0]).toBe(result.decisionId);
    expect(result.supersededDecisionIds).toEqual(["d-old"]);

    // Nothing deletes or rewrites a decision. Ever.
    expect(find(db.calls, "DELETE FROM checkpoint_decisions")).toHaveLength(0);
  });

  it("puts a fully ready checkpoint back into the queue as `ready`", async () => {
    const db = fakeDb(decidedState());
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Objavil sa nový podklad, vraciame na rozhodnutie.",
      actor: actor(),
    });
    if ("status" in result) throw new Error("expected success");

    expect(result.lifecycle).toBe("ready");
    expect(result.version).toBe(5);
    const update = find(db.calls, "UPDATE checkpoints");
    expect(update[0].sql).toContain("decided_at = NULL");
    expect(update[0].params).toEqual(["ready", "u-approver", "cp1", 4]);
  });

  it("comes back as `planned` when the checklist is not actually complete", async () => {
    // Only reachable for a decision taken through a readiness override: labelling
    // it `ready` would contradict its own checklist.
    const db = fakeDb(decidedState({ requiredComplete: 1 }));
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Override bol predčasný, vraciame do prípravy.",
      actor: actor({ canOverrideReadiness: true }),
    });
    if ("status" in result) throw new Error("expected success");
    expect(result.lifecycle).toBe("planned");
    expect(result.readiness).toBe(50);
  });

  it("writes an audit row with the mandatory reason", async () => {
    const db = fakeDb(decidedState());
    await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Rozhodnutie bolo prijaté na nesprávnych podkladoch.",
      actor: actor(),
    });
    const audit = find(db.calls, "INSERT INTO audit_log");
    expect(audit).toHaveLength(1);
    expect(audit[0].params[2]).toBe("checkpoint.reopen");
    expect(String(audit[0].params[6])).toContain("nesprávnych podkladoch");
  });

  it("refuses to reopen a checkpoint that was never decided", async () => {
    const db = fakeDb(state());
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Skúšam znovuotvoriť nerozhodnutý checkpoint.",
      actor: actor(),
    });
    expect(result).toMatchObject({ status: 409, code: "NOT_DECIDED" });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("returns 409 with the current version on a stale version", async () => {
    const db = fakeDb(decidedState());
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 1,
      reason: "Dôvod dlhší než desať znakov.",
      actor: actor(),
    });
    expect(result).toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
      currentVersion: 4,
    });
    expect(writes(db.calls)).toHaveLength(0);
  });

  it("notifies the project owner and the checkpoint owner, never the actor", async () => {
    const db = fakeDb(decidedState());
    const result = await reopenCheckpoint(db, {
      checkpointId: "cp1",
      expectedVersion: 4,
      reason: "Vraciame na rozhodnutie po zmene rozsahu.",
      actor: actor(),
    });
    if ("status" in result) throw new Error("expected success");
    expect(result.notifiedUserIds).toEqual(["u-project-owner", "u-owner"]);
    expect(result.notifiedUserIds).not.toContain("u-approver");
  });
});

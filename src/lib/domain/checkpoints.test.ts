// The two rules the decision pillar rests on:
//
//   * `computeReadiness` — the share of the REQUIRED checklist conditions that are
//     complete. Optional conditions never move it, an empty checklist is 0 % (not a
//     vacuous 100 %), and rounding may never manufacture a 100 %.
//   * `validateDecisionGate` — may THIS user decide THIS checkpoint right now.
//     Below 100 % readiness: no. With `readiness.override` but no reason: no. Type
//     `gate` where the approver is also the owner: no. The same person on a
//     `review`: yes, deliberately (spec Q35 — a blanket four-eyes rule would
//     deadlock a 3–4 person team).
//
// `@/lib/db` is mocked so importing the module under test does not pull in the
// mariadb pool or the env validation.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import {
  computeReadiness,
  computeReadinessFromCounts,
  daysBetween,
  lifecycleForReadiness,
  mapCheckpoint,
  refreshProjectNextCheckpoint,
  replaceRequirements,
  todayLocalDate,
  validateDecisionGate,
  viewerOf,
  type CheckpointRow,
  type DecisionGateInput,
  type SqlRunner,
} from "./checkpoints";
import { FULL_READINESS } from "./contracts/checkpoints";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RecordedCall {
  sql: string;
  params: unknown[];
}

/** A `SqlRunner` that records every statement and answers from a handler. */
function fakeRunner(
  handler: (sql: string, params: unknown[]) => unknown = () => undefined,
): SqlRunner & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  return {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      const res = handler(sql, params);
      return res === undefined ? { affectedRows: 1 } : res;
    },
  };
}

function required(complete: boolean) {
  return { required: true, complete };
}
function optional(complete: boolean) {
  return { required: false, complete };
}

/** A gate input that PASSES; each test breaks exactly one thing. */
function gateInput(over: Partial<DecisionGateInput> = {}): DecisionGateInput {
  return {
    checkpointType: "review",
    lifecycle: "ready",
    readiness: 100,
    ownerId: "user-owner",
    approverId: "user-approver",
    actorId: "user-approver",
    canOverrideReadiness: false,
    overrideReason: null,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// computeReadiness
// ---------------------------------------------------------------------------

describe("computeReadiness", () => {
  it("is 0 % with no conditions at all", () => {
    // 0/0 is NOT a vacuous 100 %: a checkpoint whose "ready" was never defined
    // must not be decidable without an explicit admin override.
    expect(computeReadiness([])).toBe(0);
  });

  it("is 0 % when every condition is optional, even if all are complete", () => {
    expect(computeReadiness([optional(true), optional(true)])).toBe(0);
  });

  it("counts only the required conditions", () => {
    // 1 of 2 required complete = 50 %; the two optional rows are ignored entirely.
    expect(
      computeReadiness([
        required(true),
        required(false),
        optional(true),
        optional(false),
      ]),
    ).toBe(50);
  });

  it("is 100 % when every required condition is complete", () => {
    expect(computeReadiness([required(true), required(true)])).toBe(
      FULL_READINESS,
    );
  });

  it("stays 100 % when an optional condition is still open", () => {
    expect(computeReadiness([required(true), optional(false)])).toBe(
      FULL_READINESS,
    );
  });

  it("rounds intermediate values to whole percent", () => {
    expect(computeReadiness([required(true), required(false), required(false)])).toBe(
      33,
    );
    expect(computeReadiness([required(true), required(true), required(false)])).toBe(
      67,
    );
  });

  it("never rounds UP to 100 % while a required condition is open", () => {
    // 199/200 rounds to 100 %. 100 % is what opens the decision gate, so the
    // value is capped at 99 until the last required condition is actually done.
    expect(computeReadinessFromCounts(200, 199)).toBe(99);
    expect(computeReadinessFromCounts(200, 200)).toBe(FULL_READINESS);
  });

  it("clamps nonsensical counts instead of exceeding 100 %", () => {
    expect(computeReadinessFromCounts(2, 5)).toBe(FULL_READINESS);
    expect(computeReadinessFromCounts(0, 3)).toBe(0);
    expect(computeReadinessFromCounts(3, -1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// lifecycleForReadiness
// ---------------------------------------------------------------------------

describe("lifecycleForReadiness", () => {
  it("promotes to ready at 100 % and back to planned below it", () => {
    expect(lifecycleForReadiness("planned", 100)).toBe("ready");
    expect(lifecycleForReadiness("ready", 60)).toBe("planned");
  });

  it("keeps `decided` — editing a checklist does not un-decide anything", () => {
    expect(lifecycleForReadiness("decided", 0)).toBe("decided");
    expect(lifecycleForReadiness("decided", 100)).toBe("decided");
  });

  it("keeps `blocked` — a human statement outranks the percentage", () => {
    expect(lifecycleForReadiness("blocked", 100)).toBe("blocked");
  });
});

// ---------------------------------------------------------------------------
// The decision gate
// ---------------------------------------------------------------------------

describe("validateDecisionGate", () => {
  it("allows the approver to decide a fully ready checkpoint", () => {
    expect(validateDecisionGate(gateInput())).toBeNull();
  });

  it("refuses a decision below 100 % readiness", () => {
    const rejection = validateDecisionGate(
      gateInput({ readiness: 80, lifecycle: "planned" }),
    );
    expect(rejection).not.toBeNull();
    expect(rejection?.status).toBe(422);
    expect(rejection?.code).toBe("NOT_READY");
    // The message names the current value so the user knows how far off they are.
    expect(rejection?.message).toContain("80");
  });

  it("refuses an override with no reason", () => {
    const rejection = validateDecisionGate(
      gateInput({ readiness: 40, canOverrideReadiness: true }),
    );
    expect(rejection?.status).toBe(400);
    expect(rejection?.code).toBe("OVERRIDE_REASON_REQUIRED");
  });

  it("refuses an override whose reason is only whitespace", () => {
    const rejection = validateDecisionGate(
      gateInput({
        readiness: 40,
        canOverrideReadiness: true,
        overrideReason: "   ",
      }),
    );
    expect(rejection?.code).toBe("OVERRIDE_REASON_REQUIRED");
  });

  it("allows an override with a reason", () => {
    expect(
      validateDecisionGate(
        gateInput({
          readiness: 40,
          canOverrideReadiness: true,
          overrideReason: "Dodávateľ potvrdil termín mimo systému.",
        }),
      ),
    ).toBeNull();
  });

  it("refuses a `gate` whose approver is also the owner", () => {
    const rejection = validateDecisionGate(
      gateInput({
        checkpointType: "gate",
        ownerId: "user-same",
        approverId: "user-same",
        actorId: "user-same",
      }),
    );
    expect(rejection?.status).toBe(422);
    expect(rejection?.code).toBe("GATE_SAME_PERSON");
  });

  it("allows a `review` whose approver is also the owner", () => {
    // Spec Q35: the four-eyes rule applies to `gate` ONLY. With a 3–4 person team
    // a blanket rule would block the app.
    expect(
      validateDecisionGate(
        gateInput({
          checkpointType: "review",
          ownerId: "user-same",
          approverId: "user-same",
          actorId: "user-same",
        }),
      ),
    ).toBeNull();
  });

  it.each(["review", "decision", "delivery"] as const)(
    "allows the same person on type %s",
    (checkpointType) => {
      expect(
        validateDecisionGate(
          gateInput({
            checkpointType,
            ownerId: "u",
            approverId: "u",
            actorId: "u",
          }),
        ),
      ).toBeNull();
    },
  );

  it("refuses anyone who is not the named approver", () => {
    const rejection = validateDecisionGate(gateInput({ actorId: "user-other" }));
    expect(rejection?.status).toBe(403);
    expect(rejection?.code).toBe("NOT_APPROVER");
  });

  it("refuses when no approver is assigned", () => {
    const rejection = validateDecisionGate(gateInput({ approverId: null }));
    expect(rejection?.status).toBe(422);
    expect(rejection?.code).toBe("NO_APPROVER");
  });

  it("refuses an already decided checkpoint before any other check", () => {
    // Immutability is checked FIRST: a decided checkpoint must report "immutable",
    // not "not ready", even when its readiness has since drifted.
    const rejection = validateDecisionGate(
      gateInput({ lifecycle: "decided", readiness: 10 }),
    );
    expect(rejection?.status).toBe(409);
    expect(rejection?.code).toBe("ALREADY_DECIDED");
  });

  it("does not apply the gate rule when the owner is unset", () => {
    expect(
      validateDecisionGate(
        gateInput({ checkpointType: "gate", ownerId: null }),
      ),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// viewerOf
// ---------------------------------------------------------------------------

describe("viewerOf", () => {
  it("reads the two decision capabilities off the expanded rights", () => {
    expect(viewerOf({ id: "u1", rights: ["decisions.decide"] })).toEqual({
      id: "u1",
      canDecide: true,
      canOverrideReadiness: false,
    });
  });

  it("treats the `admin` meta right as holding everything", () => {
    const viewer = viewerOf({ id: "u1", rights: ["admin"] });
    expect(viewer.canDecide).toBe(true);
    expect(viewer.canOverrideReadiness).toBe(true);
  });

  it("gives a viewer no decision capability", () => {
    const viewer = viewerOf({ id: "u1", rights: ["checkpoints.read"] });
    expect(viewer.canDecide).toBe(false);
    expect(viewer.canOverrideReadiness).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

describe("calendar helpers", () => {
  it("formats today from LOCAL fields, not from a UTC round-trip", () => {
    // 00:30 local in Europe/Bratislava is still the previous day in UTC. Deriving
    // the day through toISOString() would report 2026-07-27 here.
    expect(todayLocalDate(new Date(2026, 6, 28, 0, 30))).toBe("2026-07-28");
    expect(todayLocalDate(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });

  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-07-28", "2026-07-31")).toBe(3);
    expect(daysBetween("2026-07-28", "2026-07-28")).toBe(0);
    expect(daysBetween("2026-07-28", "2026-07-20")).toBe(-8);
  });

  it("counts across a DST boundary without drifting", () => {
    // Bratislava switches to CET on 2026-10-25; the day count must stay whole.
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Row → DTO
// ---------------------------------------------------------------------------

function checkpointRow(over: Partial<CheckpointRow> = {}): CheckpointRow {
  return {
    id: "cp1",
    project_id: "p1",
    project_code: "AUR",
    project_name: "Aura",
    name: "Bezpečnostná revízia",
    description: null,
    impact: null,
    checkpoint_type: "review",
    lifecycle: "planned",
    due_date: "2026-08-10",
    start_date: null,
    end_date: null,
    owner_id: "user-owner",
    owner_name: "Anna Adamová",
    owner_initials: "AA",
    approver_id: "user-approver",
    approver_name: "Boris Beňo",
    approver_initials: "BB",
    readiness: 0,
    required_count: 2,
    required_complete: 1,
    optional_count: 1,
    optional_complete: 0,
    decided_at: null,
    version: 3,
    created_at: null,
    updated_at: null,
    ...over,
  };
}

describe("mapCheckpoint", () => {
  it("recomputes readiness from the counts and ignores the cached column", () => {
    // `readiness: 0` on the row is a stale cache; the checklist says 1 of 2.
    const dto = mapCheckpoint(checkpointRow(), { today: "2026-08-01" });
    expect(dto.readiness).toBe(50);
    expect(dto.requiredCount).toBe(2);
    expect(dto.requiredCompleteCount).toBe(1);
    expect(dto.optionalCount).toBe(1);
  });

  it("marks an undecided past-due checkpoint overdue", () => {
    const dto = mapCheckpoint(checkpointRow(), { today: "2026-08-15" });
    expect(dto.daysUntilDue).toBe(-5);
    expect(dto.overdue).toBe(true);
  });

  it("never marks a decided checkpoint overdue", () => {
    const dto = mapCheckpoint(
      checkpointRow({ lifecycle: "decided", required_complete: 2 }),
      { today: "2026-08-15" },
    );
    expect(dto.overdue).toBe(false);
  });

  it("explains to the approver why deciding is blocked", () => {
    const dto = mapCheckpoint(checkpointRow(), {
      today: "2026-08-01",
      viewer: { id: "user-approver", canDecide: true, canOverrideReadiness: false },
    });
    expect(dto.canDecide).toBe(false);
    expect(dto.decisionBlockedReason).toContain("100 %");
  });

  it("lets the approver decide once the checklist is complete", () => {
    const dto = mapCheckpoint(
      checkpointRow({ required_complete: 2, lifecycle: "ready" }),
      {
        today: "2026-08-01",
        viewer: {
          id: "user-approver",
          canDecide: true,
          canOverrideReadiness: false,
        },
      },
    );
    expect(dto.canDecide).toBe(true);
    expect(dto.decisionBlockedReason).toBeNull();
  });

  it("tells a non-approver that they are not the approver", () => {
    const dto = mapCheckpoint(
      checkpointRow({ required_complete: 2, lifecycle: "ready" }),
      {
        today: "2026-08-01",
        viewer: { id: "user-owner", canDecide: true, canOverrideReadiness: true },
      },
    );
    expect(dto.canDecide).toBe(false);
    expect(dto.decisionBlockedReason).toContain("schvaľovateľ");
  });

  it("tells a viewer without the right that they lack permission", () => {
    const dto = mapCheckpoint(
      checkpointRow({ required_complete: 2, lifecycle: "ready" }),
      {
        today: "2026-08-01",
        viewer: { id: "user-approver", canDecide: false, canOverrideReadiness: false },
      },
    );
    expect(dto.canDecide).toBe(false);
    expect(dto.decisionBlockedReason).toContain("oprávnenie");
  });
});

// ---------------------------------------------------------------------------
// replaceRequirements — the bulk checklist write
// ---------------------------------------------------------------------------

describe("replaceRequirements", () => {
  it("updates kept rows, inserts new ones, deletes the omitted and renumbers", async () => {
    const runner = fakeRunner((sql) =>
      sql.includes("SELECT id FROM checkpoint_requirements")
        ? [{ id: "r-keep" }, { id: "r-drop" }]
        : undefined,
    );

    const rejected = await replaceRequirements(
      runner,
      "cp1",
      [
        { id: "r-keep", label: "Podpis vlastníka", required: true, complete: true },
        { label: "Test na stagingu", required: true, complete: false },
      ],
      "actor-1",
    );
    expect(rejected).toBeNull();

    const deletes = runner.calls.filter((c) => c.sql.startsWith("DELETE"));
    expect(deletes).toHaveLength(1);
    expect(deletes[0].params).toEqual(["r-drop"]);

    const updates = runner.calls.filter((c) =>
      c.sql.includes("UPDATE checkpoint_requirements"),
    );
    expect(updates).toHaveLength(1);
    // sort_order comes from the array index, so a reorder cannot desync.
    expect(updates[0].params).toEqual([
      "Podpis vlastníka",
      1,
      1,
      0,
      "actor-1",
      "r-keep",
      "cp1",
    ]);

    const inserts = runner.calls.filter((c) =>
      c.sql.includes("INSERT INTO checkpoint_requirements"),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params.slice(1)).toEqual([
      "cp1",
      "Test na stagingu",
      1,
      0,
      1,
      "actor-1",
    ]);
  });

  it("refuses an id that belongs to another checkpoint and writes nothing", async () => {
    const runner = fakeRunner((sql) =>
      sql.includes("SELECT id FROM checkpoint_requirements") ? [{ id: "r-mine" }] : undefined,
    );

    const rejected = await replaceRequirements(
      runner,
      "cp1",
      [{ id: "r-someone-else", label: "Cudzia podmienka", required: true, complete: true }],
      "actor-1",
    );
    expect(rejected?.status).toBe(400);
    expect(rejected?.code).toBe("UNKNOWN_REQUIREMENT");
    expect(
      runner.calls.some(
        (c) => c.sql.startsWith("DELETE") || c.sql.includes("INSERT"),
      ),
    ).toBe(false);
  });

  it("clears the whole checklist when sent an empty list", async () => {
    const runner = fakeRunner((sql) =>
      sql.includes("SELECT id FROM checkpoint_requirements")
        ? [{ id: "r1" }, { id: "r2" }]
        : undefined,
    );
    await replaceRequirements(runner, "cp1", [], "actor-1");
    expect(runner.calls.filter((c) => c.sql.startsWith("DELETE"))).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// refreshProjectNextCheckpoint — the projects.next_checkpoint cache
// ---------------------------------------------------------------------------
// This is the SINGLE implementation of the cache refresh (a pool-based twin used
// to live in domain/projects.ts and could not see a transaction's uncommitted
// checkpoint change). These cases moved here with it.

describe("refreshProjectNextCheckpoint", () => {
  it("caches the nearest UNDECIDED checkpoint", async () => {
    const runner = fakeRunner((sql) =>
      sql.startsWith("SELECT")
        ? [{ name: "Rozhodnutie o dodávateľovi", due_date: "2026-03-05" }]
        : undefined,
    );

    await refreshProjectNextCheckpoint(runner, "p-1");

    const select = runner.calls[0];
    expect(select.sql).toContain("lifecycle <> 'decided'");
    expect(select.sql).toContain("ORDER BY due_date ASC");
    // Formatted in SQL, never via toISOString() — no timezone day shift.
    expect(select.sql).toContain("DATE_FORMAT(due_date, '%Y-%m-%d')");

    const update = runner.calls[1];
    expect(update.sql).toContain("UPDATE projects");
    expect(update.params).toEqual([
      "Rozhodnutie o dodávateľovi",
      "2026-03-05",
      "p-1",
    ]);
  });

  it("clears the cache when every checkpoint is decided", async () => {
    const runner = fakeRunner((sql) => (sql.startsWith("SELECT") ? [] : undefined));

    await refreshProjectNextCheckpoint(runner, "p-1");

    // `next_checkpoint` is NOT NULL DEFAULT '', so "no checkpoint" is '' + NULL.
    expect(runner.calls[1].params).toEqual(["", null, "p-1"]);
  });

  it("does NOT touch updated_at (it would invalidate the concurrency token)", async () => {
    const runner = fakeRunner((sql) => (sql.startsWith("SELECT") ? [] : undefined));
    await refreshProjectNextCheckpoint(runner, "p-1");
    expect(runner.calls[1].sql).not.toContain("updated_at");
  });

  it("is a no-op without a project id", async () => {
    const runner = fakeRunner();
    await refreshProjectNextCheckpoint(runner, "");
    expect(runner.calls).toHaveLength(0);
  });
});

// Risk-first ordering for the Overview project block (spec Q2):
// "health first (red at the top), then the nearest checkpoint".
//
// The list endpoint already defaults to `sort=risk`, so this is a SECOND,
// independent implementation on purpose: the Overview must not silently reorder
// itself if a caller ever passes a different `sort`, and the rule is the one thing
// on the dashboard a reader trusts without checking ("the red ones are on top").
// Being pure, it is also the only version that can be unit-tested.

import { HEALTH_RANK } from "@/lib/client/domain";
import type { ProjectDto } from "@/lib/domain/contracts/projects";

/** Priority order P1 → P3 as the third tie-breaker. */
const PRIORITY_RANK: Readonly<Record<string, number>> = { P1: 0, P2: 1, P3: 2 };

/**
 * A NULL next-checkpoint date sorts LAST: "nothing scheduled" is not more urgent
 * than a date, and `null` compared as a string would otherwise win every time.
 */
function checkpointRank(date: string | null): string {
  return date ?? "9999-99-99";
}

/**
 * Sort a copy of `projects` risk-first. Never mutates the input — the caller
 * holds the fetched array and React state must stay referentially honest.
 */
export function sortByRisk(
  projects: ReadonlyArray<ProjectDto>,
): ProjectDto[] {
  return [...projects].sort((a, b) => {
    const health = HEALTH_RANK[a.health] - HEALTH_RANK[b.health];
    if (health !== 0) return health;

    const next = checkpointRank(a.nextCheckpointDate).localeCompare(
      checkpointRank(b.nextCheckpointDate),
    );
    if (next !== 0) return next;

    const priority =
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (priority !== 0) return priority;

    return a.code.localeCompare(b.code, "sk");
  });
}

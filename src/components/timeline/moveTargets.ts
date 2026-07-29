// Which sprints the "Presunúť položku" dialog may offer for a given item.
//
// The planner axis spans PROJECTS (it is one plan of everything in the horizon),
// but `POST /api/work-items/[id]/move` refuses a sprint that belongs to another
// project with 400 "Šprint patrí inému projektu." (see lib/domain/workItems
// `relationError`). Offering the whole horizon therefore produced options that
// could only ever end in an error toast — on the seeded data every single sprint
// target for a backlog item was such a dead end.
//
// Kept as a pure function rather than inline in the component so the rule is
// unit-testable: vitest runs in the "node" environment here, so a component that
// renders cannot be asserted on, but this can.

import type { SprintWithMetricsDto } from "@/lib/domain/contracts/sprints";

/** Minimal shape needed from the item — its owning project. */
export interface MovableItem {
  projectId: string;
}

/**
 * Sprints from `sprints` that the API will actually accept as a target for
 * `item`, in the order given (axis order). May legitimately be empty: a project
 * with no sprint in the horizon leaves "Backlog" as the only destination.
 */
export function moveTargets<S extends Pick<SprintWithMetricsDto, "projectId">>(
  sprints: readonly S[],
  item: MovableItem,
): S[] {
  return sprints.filter((sprint) => sprint.projectId === item.projectId);
}

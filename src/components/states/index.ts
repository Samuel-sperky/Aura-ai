// The ONE canonical family of system states. Every data page picks from here —
// no page invents its own empty/error panel.
//
// Decision order on a data page:
//   1. first load, no data        → <LoadingState/>
//   2. request failed             → <ErrorState onRetry={refetch}/>
//   3. no right (server-checked)  → <ForbiddenState/>
//   4. zero rows + active filters → <NoResultsState onResetFilters={…}/>
//   5. zero rows, no filters      → <EmptyState/> (CTA only if the user may act)
//   6. otherwise                  → the content

export { LoadingState } from "./LoadingState";
export type { LoadingStateProps } from "./LoadingState";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { NoResultsState } from "./NoResultsState";
export type { NoResultsStateProps } from "./NoResultsState";
export { ErrorState } from "./ErrorState";
export type { ErrorStateProps } from "./ErrorState";
export { ForbiddenState } from "./ForbiddenState";
export type { ForbiddenStateProps } from "./ForbiddenState";

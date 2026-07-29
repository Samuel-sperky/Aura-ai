import { SearchX } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface NoResultsStateProps {
  /** Wire this to the toolbar's reset — the whole point of this state. */
  onResetFilters?: () => void;
  title?: string;
  description?: string;
  bare?: boolean;
  className?: string;
}

/**
 * "Your filters matched nothing" — a different state from `EmptyState`.
 * Muted, and its ONE action clears the filters rather than creating data.
 */
export function NoResultsState({
  onResetFilters,
  title = "Nenašli sa žiadne výsledky",
  description = "Upravte filtre alebo hľadaný výraz.",
  bare = false,
  className,
}: NoResultsStateProps) {
  return (
    <EmptyState
      icon={SearchX}
      tone="muted"
      title={title}
      description={description}
      actionLabel={onResetFilters ? "Zrušiť filtre" : undefined}
      onAction={onResetFilters}
      bare={bare}
      className={className}
    />
  );
}

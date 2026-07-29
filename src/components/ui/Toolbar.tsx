import type { HTMLAttributes, ReactNode } from "react";
import { Pencil, Search, X } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { cx } from "./cx";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Pins the row under the topbar while the content scrolls. */
  sticky?: boolean;
}

/** A single row of controls. Use `<ToolbarSpacer/>` to push actions right. */
export function Toolbar({ sticky = false, className, ...rest }: ToolbarProps) {
  return (
    <div
      {...rest}
      className={cx("toolbar", sticky && "toolbar-sticky", className)}
    />
  );
}

export function ToolbarSpacer() {
  return <span className="spacer" />;
}

export interface ToolbarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name; defaults to the placeholder. */
  ariaLabel?: string;
  className?: string;
}

/** Fulltext box with a leading icon. One per page — never two search fields. */
export function ToolbarSearch({
  value,
  onChange,
  placeholder = "Hľadať…",
  ariaLabel,
  className,
}: ToolbarSearchProps) {
  return (
    <div className={cx("toolbar-search", className)}>
      <Search size={15} aria-hidden="true" />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export interface FilterChipDescriptor {
  key: string;
  /** Already composed, e.g. "Oblasť: Platforma". */
  label: string;
  /** Omit to render a NON-removable chip (the period chip is the canonical case). */
  onRemove?: () => void;
  /** Renders a pencil that opens the underlying control. */
  onEdit?: () => void;
}

/** Same as the descriptor minus React's reserved `key`. */
export type FilterChipProps = Omit<FilterChipDescriptor, "key">;

/**
 * A tray chip. Unlike `Chip` (a toggle) this is a static descriptor of an active
 * filter with up to two affordances, so it is a <span> holding real buttons.
 */
export function FilterChip({ label, onRemove, onEdit }: FilterChipProps) {
  return (
    <span className="chip">
      {label}
      {onEdit ? (
        <button
          type="button"
          className="chip-remove"
          aria-label={`Upraviť ${label}`}
          onClick={onEdit}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="chip-remove"
          aria-label={`Zrušiť filter ${label}`}
          onClick={onRemove}
        >
          <X size={13} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export interface FilterToolbarProps {
  /** Controls row (search, selects, segmented view switch). */
  children?: ReactNode;
  /** Active-filter chips rendered under the controls. */
  chips?: ReadonlyArray<FilterChipDescriptor>;
  /**
   * "Zrušiť filtre" appears automatically when ≥2 REMOVABLE chips are present.
   * Must skip non-removable chips (period).
   */
  onResetAll?: () => void;
  sticky?: boolean;
  /** Greys the controls out (e.g. a tab that has no data to filter). */
  disabled?: boolean;
  disabledHint?: ReactNode;
  className?: string;
}

/**
 * The canonical filter host for data pages: controls row + chip tray.
 * Fulltext/sort/columns belong to the table, not here — no duplicate controls.
 */
export function FilterToolbar({
  children,
  chips,
  onResetAll,
  sticky = false,
  disabled = false,
  disabledHint,
  className,
}: FilterToolbarProps) {
  const removable = (chips ?? []).filter((c) => typeof c.onRemove === "function");
  return (
    <div
      className={cx("filter-toolbar", sticky && "toolbar-sticky", className)}
    >
      {disabled ? (
        disabledHint ? (
          <p className="meta">{disabledHint}</p>
        ) : null
      ) : (
        <Toolbar>{children}</Toolbar>
      )}
      {chips && chips.length > 0 ? (
        <div className="chip-tray" role="region" aria-label="Aktívne filtre">
          <span className="eyebrow">Filtre</span>
          {chips.map(({ key, ...chip }) => (
            <FilterChip key={key} {...chip} />
          ))}
          {removable.length >= 2 && onResetAll ? (
            <Button size="xs" variant="ghost" onClick={onResetAll}>
              Zrušiť filtre
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

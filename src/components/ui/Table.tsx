import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cx } from "./cx";
import { Skeleton } from "./Skeleton";

export type SortDir = "asc" | "desc";

export interface TableSort {
  key: string;
  dir: SortDir;
}

export interface TableColumn<T> {
  /** Stable key; also the sort key sent to `onSortChange`. */
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** Right-aligns + tabular-nums. Use for every numeric column. */
  align?: "left" | "right";
  /** Inline width, e.g. "88px" or "22%". */
  width?: string;
  sortable?: boolean;
  /** Tooltip on the header cell when the label had to be abbreviated. */
  headerTitle?: string;
}

export interface TableProps<T> {
  columns: ReadonlyArray<TableColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T, index: number) => string;
  /**
   * OPT-IN row affordance. Without it rows get no pointer and no accent hover —
   * a table that looks clickable but is not is the family's worst UX trap.
   * Setting it also makes rows keyboard-activatable.
   */
  rowsClickable?: boolean;
  onRowClick?: (row: T, index: number) => void;
  sort?: TableSort;
  /** Called with the column key; the caller decides asc/desc/none cycling. */
  onSortChange?: (key: string) => void;
  /** Rendered inside the table body when there are no rows (EmptyState bare). */
  empty?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  /** Screen-reader table description. */
  caption?: string;
  className?: string;
}

const SORT_LABEL: Record<SortDir, string> = {
  asc: "vzostupne",
  desc: "zostupne",
};

export function Table<T>({
  columns,
  rows,
  rowKey,
  rowsClickable = false,
  onRowClick,
  sort,
  onSortChange,
  empty,
  loading = false,
  loadingRows = 6,
  caption,
  className,
}: TableProps<T>) {
  const clickable = rowsClickable && typeof onRowClick === "function";

  return (
    <div className="tbl-wrap">
      <table
        className={cx("tbl", clickable && "rows-clickable", className)}
        aria-busy={loading || undefined}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const dir = active ? sort.dir : undefined;
              return (
                <th
                  key={c.key}
                  scope="col"
                  title={c.headerTitle}
                  style={c.width ? { width: c.width } : undefined}
                  className={c.align === "right" ? "num" : undefined}
                  aria-sort={
                    active
                      ? dir === "asc"
                        ? "ascending"
                        : "descending"
                      : c.sortable
                        ? "none"
                        : undefined
                  }
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="th-sort"
                      onClick={() => onSortChange(c.key)}
                    >
                      {c.header}
                      {active ? (
                        dir === "asc" ? (
                          <ArrowUp size={12} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={12} aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown size={12} aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {active
                          ? ` — zoradené ${SORT_LABEL[dir ?? "asc"]}`
                          : " — zoradiť"}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, r) => (
              <tr key={`sk-${r}`}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <Skeleton height={14} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onRowClick?.(row, index) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick?.(row, index);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={c.align === "right" ? "num" : undefined}
                  >
                    {c.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { Select } from "./Select";
import { cx } from "./cx";

export interface PaginationProps {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Omit to hide the page-size selector. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: ReadonlyArray<number>;
  className?: string;
}

const FMT = new Intl.NumberFormat("sk-SK");

/** Offset pagination matching the server's `pageMeta` envelope. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  return (
    <nav className={cx("pagination", className)} aria-label="Stránkovanie">
      <span className="pagination-info">
        {total === 0
          ? "Žiadne záznamy"
          : `${FMT.format(from)}–${FMT.format(to)} z ${FMT.format(total)}`}
      </span>
      <span className="spacer" />
      {onPageSizeChange ? (
        <>
          <label className="pagination-info" htmlFor="page-size">
            Na stránku
          </label>
          <Select
            id="page-size"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            options={pageSizeOptions.map((n) => ({
              value: String(n),
              label: String(n),
            }))}
            style={{ width: "auto" }}
          />
        </>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        iconOnly
        icon={ChevronLeft}
        aria-label="Predchádzajúca stránka"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
      />
      <span className="pagination-info tnum">
        {current} / {totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        iconOnly
        icon={ChevronRight}
        aria-label="Ďalšia stránka"
        disabled={current >= totalPages}
        onClick={() => onPageChange(current + 1)}
      />
    </nav>
  );
}

import { describe, it, expect } from "vitest";
import { pageMeta, toPagination, MAX_PAGE_SIZE, dateOrNull } from "./data";

// These run under TZ=Europe/Bratislava (vitest.config.ts), which is exactly the
// positive UTC offset that made the original toISOString() implementation shift
// every DATE column one calendar day backwards.
describe("dateOrNull", () => {
  it("keeps the LOCAL calendar day of a Date at local midnight (no UTC shift)", () => {
    // What the mariadb driver hands back for a DATE column holding 2026-08-10.
    expect(dateOrNull(new Date(2026, 7, 10))).toBe("2026-08-10");
    // Winter offset (+1) as well as summer (+2).
    expect(dateOrNull(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(dateOrNull(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("passes an already-formatted calendar date through verbatim", () => {
    expect(dateOrNull("2026-08-10")).toBe("2026-08-10");
    expect(dateOrNull("2026-08-10 00:00:00")).toBe("2026-08-10");
    expect(dateOrNull("2026-08-10T22:30:00.000Z")).toBe("2026-08-10");
  });

  it("returns null for absent or unparseable values", () => {
    expect(dateOrNull(null)).toBeNull();
    expect(dateOrNull(undefined)).toBeNull();
    expect(dateOrNull("")).toBeNull();
    expect(dateOrNull("   ")).toBeNull();
    expect(dateOrNull("not a date")).toBeNull();
    expect(dateOrNull(new Date("nope"))).toBeNull();
  });
});

describe("pageMeta", () => {
  it("computes totalPages and hasMore for a middle page", () => {
    const pg = toPagination(2, 20);
    expect(pageMeta(pg, 95)).toEqual({
      page: 2,
      pageSize: 20,
      total: 95,
      totalPages: 5,
      hasMore: true,
    });
  });

  it("reports hasMore=false on the last page", () => {
    const pg = toPagination(5, 20);
    expect(pageMeta(pg, 95)).toMatchObject({
      page: 5,
      totalPages: 5,
      hasMore: false,
    });
  });

  it("handles an empty result set (0 pages, no more)", () => {
    const pg = toPagination(1, 50);
    expect(pageMeta(pg, 0)).toEqual({
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("rounds a partial last page up", () => {
    const pg = toPagination(1, 50);
    expect(pageMeta(pg, 51).totalPages).toBe(2);
  });

  it("clamps pageSize to MAX_PAGE_SIZE and page to >= 1", () => {
    const pg = toPagination(0, MAX_PAGE_SIZE + 500);
    expect(pg.page).toBe(1);
    expect(pg.pageSize).toBe(MAX_PAGE_SIZE);
    expect(pg.offset).toBe(0);
    expect(pageMeta(pg, 10)).toMatchObject({ totalPages: 1, hasMore: false });
  });
});

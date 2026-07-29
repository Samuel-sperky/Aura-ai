import { describe, expect, it } from "vitest";
import { MAX_RANK, RANK_STRIDE, arrayMove, rankBetween, rankForMove } from "./rank";

describe("rankBetween", () => {
  it("lands in the middle of a wide gap", () => {
    expect(rankBetween(1000, 3000)).toBe(2000);
  });

  it("appends past the end with a stride", () => {
    expect(rankBetween(5000, null)).toBe(5000 + RANK_STRIDE);
  });

  it("halves towards zero when dropped at the top", () => {
    expect(rankBetween(null, 1000)).toBe(500);
    expect(rankBetween(null, 3)).toBe(1);
  });

  it("returns 0 at the top of an already-zero list", () => {
    expect(rankBetween(null, 0)).toBe(0);
    expect(rankBetween(null, 1)).toBe(0);
  });

  it("seeds an empty list", () => {
    expect(rankBetween(null, null)).toBe(RANK_STRIDE);
  });

  it("ties with the successor when there is no gap (documented fallback)", () => {
    expect(rankBetween(10, 11)).toBe(11);
    expect(rankBetween(10, 10)).toBe(11);
  });

  it("never returns a negative rank or one over the API ceiling", () => {
    expect(rankBetween(null, -50)).toBeGreaterThanOrEqual(0);
    expect(rankBetween(MAX_RANK, null)).toBe(MAX_RANK);
  });

  it("always returns an integer", () => {
    expect(Number.isInteger(rankBetween(1, 4))).toBe(true);
    expect(Number.isInteger(rankBetween(null, 7))).toBe(true);
  });
});

describe("rankForMove", () => {
  const ranks = [100, 200, 300, 400];

  it("moving down places the item after its new predecessor", () => {
    // 100 → index 2: neighbourhood without it is [200, 300, 400]; between 300 and 400.
    expect(rankForMove(ranks, 0, 2)).toBe(350);
  });

  it("moving up places the item before its new successor", () => {
    // 400 → index 1: without it [100, 200, 300]; between 100 and 200.
    expect(rankForMove(ranks, 3, 1)).toBe(150);
  });

  it("moving to the very top halves the current first rank", () => {
    expect(rankForMove(ranks, 2, 0)).toBe(50);
  });

  it("moving to the very end appends a stride", () => {
    expect(rankForMove(ranks, 0, 3)).toBe(400 + RANK_STRIDE);
  });

  it("returns null when nothing would change", () => {
    expect(rankForMove(ranks, 1, 1)).toBeNull();
  });

  it("returns null for indices outside the list", () => {
    expect(rankForMove(ranks, -1, 2)).toBeNull();
    expect(rankForMove(ranks, 0, 9)).toBeNull();
  });

  it("produces a rank that actually sorts to the requested slot", () => {
    const from = 0;
    const to = 2;
    const value = rankForMove(ranks, from, to);
    expect(value).not.toBeNull();
    const reordered = arrayMove(ranks, from, to);
    reordered[to] = value as number;
    const sorted = [...reordered].sort((a, b) => a - b);
    expect(sorted).toEqual(reordered);
  });
});

describe("arrayMove", () => {
  it("moves an element without mutating the input", () => {
    const input = ["a", "b", "c"];
    expect(arrayMove(input, 0, 2)).toEqual(["b", "c", "a"]);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("returns a copy unchanged for an out-of-range index", () => {
    expect(arrayMove(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

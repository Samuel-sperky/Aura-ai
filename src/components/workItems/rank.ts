// Manual ordering maths for the backlog (spec Q27: `rank_value` ascending is the
// order, priority is only the tie-breaker).
//
// A drop lands an item BETWEEN two neighbours, so the client has to name a rank
// that sorts there. Midpoint insertion is used rather than renumbering the whole
// list: renumbering would need one PATCH per row and would fight every other
// session editing the same backlog.
//
// WHEN THE GAP RUNS OUT: two adjacent integers leave nowhere to insert. The
// function then returns `prev + 1`, which TIES with `next` — and a tie is not a
// failure here, because the server's ORDER BY continues
// `rank_value ASC, priority ASC, created_at ASC`. The order stays deterministic;
// only the relative position of the two tied rows is decided by age instead of by
// the drop. That is a visible-but-harmless outcome, unlike a rejected drop.

/** Distance appended past the end of the list, leaving room for later drops. */
export const RANK_STRIDE = 1000;

/** The API's upper bound for `rank_value` (see the zod contract). */
export const MAX_RANK = 2_000_000_000;

function clamp(value: number): number {
  return Math.min(MAX_RANK, Math.max(0, Math.trunc(value)));
}

/**
 * A rank that sorts strictly between `prev` and `next`.
 * `prev === null` means "dropped at the top", `next === null` means "at the end".
 */
export function rankBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return RANK_STRIDE;

  if (prev === null) {
    const top = next as number;
    // Halve towards zero so repeated top-drops keep finding room.
    return clamp(top > 1 ? Math.floor(top / 2) : 0);
  }

  if (next === null) return clamp(prev + RANK_STRIDE);

  if (next - prev > 1) return clamp(Math.floor((prev + next) / 2));

  // No gap left — see the module header on why a tie is the accepted outcome.
  return clamp(prev + 1);
}

/**
 * The rank an item needs to sit at `toIndex` of `ranks`, where `ranks` is the
 * CURRENT order and `fromIndex` is the item being moved (so it is excluded from
 * its own neighbourhood). Returns null when the position would not change.
 */
export function rankForMove(
  ranks: ReadonlyArray<number>,
  fromIndex: number,
  toIndex: number,
): number | null {
  if (fromIndex === toIndex) return null;
  if (fromIndex < 0 || fromIndex >= ranks.length) return null;
  if (toIndex < 0 || toIndex >= ranks.length) return null;

  const without = ranks.filter((_, i) => i !== fromIndex);
  const prev = toIndex > 0 ? (without[toIndex - 1] ?? null) : null;
  const next = without[toIndex] ?? null;
  return rankBetween(prev, next);
}

/** Reorder a copy of `list`, moving `from` to `to` (array-move, no mutation). */
export function arrayMove<T>(
  list: ReadonlyArray<T>,
  from: number,
  to: number,
): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length) return out;
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

"use client";

// Is the viewport narrow enough that a wide layout must not be rendered at all?
//
// This is not a styling concern that CSS could handle. Two layouts in this app are
// genuinely too wide for a phone — the nine-column projects table and the roadmap's
// side-by-side project lanes — and in both cases hiding or scrolling them was not
// enough: any wide content at 390 px pans the whole PAGE sideways here, even inside
// its own `overflow-x: auto` container (measured: html scrollWidth 517 against a
// clientWidth of 390). `overflow-x: clip` on the root does not stop it either,
// because the root's overflow is propagated to the viewport.
//
// So the wide layout has to be absent, not merely clipped, which is a rendering
// decision and therefore lives in JS. The contract scopes mobile to reading plus
// quick actions, so each caller substitutes a shape that fits: cards for the table,
// a chronological list for the lanes.
//
// Read through `useSyncExternalStore` so the server renders the desktop branch and
// the client corrects it without a setState-in-effect round trip — the pattern the
// lint rule pushed the rest of this codebase towards.

import { useSyncExternalStore } from "react";

/** Matches the `700px` breakpoint the stylesheets already use. */
export const NARROW_QUERY = "(max-width: 700px)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(NARROW_QUERY).matches;

/** The server has no viewport; assume desktop and let the client correct it. */
const getServerSnapshot = () => false;

export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

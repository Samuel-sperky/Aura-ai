"use client";

// Remembered per-page view state (spec Q20) on top of
// `GET|PUT /api/view-preferences/[page]`.
//
// TWO LAYERS, ON PURPOSE:
//   * the URL (`nuqs`) is the SOURCE OF TRUTH for the current view — it is what
//     gets shared, bookmarked and restored by Back;
//   * `user_view_preferences` is the DEFAULT used when the URL carries nothing,
//     so returning to /projects lands on the filters you left behind.
//
// So the hook only ever writes: it reads once on mount, hands the stored config
// to the caller (which applies it ONLY when the URL is empty), then persists
// every later change debounced. A failed save is silent — losing a remembered
// filter must never interrupt work with a toast.

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import type { ViewConfig } from "@/lib/domain/contracts/projects";

/** Route keys accepted by the endpoint (`PAGE_KEYS`). */
export type ViewPageKey =
  | "overview"
  | "timeline"
  | "projects"
  | "work-items"
  | "decisions"
  | "settings";

const SAVE_DEBOUNCE_MS = 600;

export interface ViewPrefsState {
  /** The stored config, or null until the first read resolves. */
  stored: ViewConfig | null;
  /** True until the initial read settles (success or failure). */
  loading: boolean;
  /** Persist a full replacement of the page's config (debounced). */
  save: (config: ViewConfig) => void;
}

export function useViewPrefs(page: ViewPageKey): ViewPrefsState {
  const [stored, setStored] = useState<ViewConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ViewConfig | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<{ page: string; config: ViewConfig }>(
      `/api/view-preferences/${page}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (alive) setStored(data.config ?? {});
      })
      .catch(() => {
        // No stored preferences (or no right) is a normal state, not an error.
        if (alive) setStored({});
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [page]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const save = useCallback(
    (config: ViewConfig) => {
      pending.current = config;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const payload = pending.current;
        pending.current = null;
        if (!payload) return;
        void apiPut(`/api/view-preferences/${page}`, { config: payload }).catch(
          () => {
            // Deliberately silent — see the module note.
          },
        );
      }, SAVE_DEBOUNCE_MS);
    },
    [page],
  );

  return { stored, loading, save };
}

/** Read a string field out of a stored config, guarding the allowed values. */
export function storedLiteral<T extends string>(
  config: ViewConfig | null,
  key: string,
  allowed: ReadonlyArray<T>,
): T | null {
  if (!config) return null;
  const raw = (config as Record<string, unknown>)[key];
  return typeof raw === "string" && (allowed as ReadonlyArray<string>).includes(raw)
    ? (raw as T)
    : null;
}

/** Read one remembered filter value (all filters are stored as strings). */
export function storedFilter(config: ViewConfig | null, key: string): string {
  if (!config) return "";
  const filters = (config as Record<string, unknown>).filters;
  if (filters == null || typeof filters !== "object" || Array.isArray(filters)) {
    return "";
  }
  const raw = (filters as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw : "";
}

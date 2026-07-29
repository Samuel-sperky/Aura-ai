"use client";

// The signed-in user, fetched once per page from `GET /api/auth/me`.
//
// WHY A CLIENT FETCH AND NOT A SERVER PROP: the pages are client components
// (filters in the URL, modals, optimistic updates). Passing the user down from
// the layout would mean importing `@/components/shellUserServer` — and with it
// `next/headers` + `mariadb` — into the client bundle. That mistake is called out
// explicitly in A7's handoff, so the rights come over the wire instead.
//
// `can()` is UX ONLY. Every mutation is independently gated by `defineRoute`
// server-side; hiding a button just avoids offering an action that would 403.

import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api";
import { includesRight } from "@/lib/auth/rights";
import type { PublicUserDto } from "@/lib/domain/contracts/auth";

export interface MeState {
  user: PublicUserDto | null;
  loading: boolean;
  /** Slovak sentence, or null. A 401 never lands here — `apiGet` redirects. */
  error: string | null;
  /** Does the user hold `right`? False while loading (fail closed in the UI). */
  can: (right: string) => boolean;
  isAdmin: boolean;
  reload: () => void;
}

export function useMe(): MeState {
  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    apiGet<{ user: PublicUserDto }>("/api/auth/me", { signal: controller.signal })
      .then((data) => {
        if (!alive) return;
        setUser(data.user);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Prihlásenie sa nepodarilo overiť. Skúste obnoviť stránku.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [nonce]);

  const can = useCallback(
    (right: string) => (user ? includesRight(user.rights, right) : false),
    [user],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    user,
    loading,
    error,
    can,
    isAdmin: user?.role === "admin",
    reload,
  };
}

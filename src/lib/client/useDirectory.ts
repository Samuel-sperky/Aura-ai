"use client";

// The people directory behind every assignee / approver picker.
//
// Fetched from `GET /api/users`, which returns id + display name + initials only
// (see that route's header for why it is not `/api/admin/users`). Loaded once per
// mounting view — at 15 users there is nothing to paginate or cache globally.

import { useEffect, useMemo, useState } from "react";
import { apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";

export interface DirectoryUser {
  id: string;
  displayName: string;
  initials: string;
}

export interface DirectoryState {
  users: DirectoryUser[];
  loading: boolean;
  /** id → display name, for rendering an assignee the list rows did not resolve. */
  byId: ReadonlyMap<string, DirectoryUser>;
}

export function useDirectory(includeInactive = false): DirectoryState {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<DirectoryUser>>(
      `/api/users${qs({ includeInactive: includeInactive ? 1 : 0, pageSize: 200 })}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (alive) setUsers(res.items);
      })
      .catch(() => {
        // A picker with no options degrades to "Nepriradené"; not toast-worthy.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [includeInactive]);

  const byId = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  return { users, loading, byId };
}

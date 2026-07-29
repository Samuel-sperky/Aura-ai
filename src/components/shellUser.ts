// CLIENT-SAFE half of the shell's user contract: the type and the Slovak role
// labels. Only a TYPE is imported from the auth layer, so nothing server-only
// (next/headers, the DB pool) is pulled into the client bundle.
//
// The server half — `currentShellUser()` — lives in ./shellUserServer.ts.

import type { RoleKey } from "@/lib/auth/rbac";

/** The slice of the session the shell needs. Nothing sensitive. */
export interface ShellUser {
  displayName: string;
  email: string;
  role: RoleKey;
  rights: ReadonlyArray<string>;
}

/** Slovak role labels for the sidebar pill (DB keys stay English). */
export const ROLE_LABEL: Record<RoleKey, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Prehliadač",
};

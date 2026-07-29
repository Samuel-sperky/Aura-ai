// SERVER ONLY — reads cookies through the auth layer (next/headers + DB).
// Never import this from a Client Component; use ./shellUser.ts for the type.

import { requireUser } from "@/lib/auth/rbac";
import type { ShellUser } from "./shellUser";

/**
 * Resolve the signed-in user for the app shell, or null when there is no valid
 * session.
 *
 * Deliberately swallowing the error: the shell is chrome, not a gate. Real
 * authorization happens per request in `defineRoute()` / `requireRight()`, so a
 * null here only means "render the shell without the user block". It also keeps
 * `layout.tsx` rendering while the auth layer is still a stub.
 */
export async function currentShellUser(): Promise<ShellUser | null> {
  try {
    const user = await requireUser();
    return {
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      rights: user.rights,
    };
  } catch {
    return null;
  }
}

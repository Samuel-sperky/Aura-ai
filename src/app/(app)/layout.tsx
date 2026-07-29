import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

/**
 * Layout for the six application routes.
 *
 * Its ONE job is mounting the `nuqs` adapter, which v2 requires above every
 * `useQueryState` / `useQueryStates` call. It lives here — once — rather than
 * being repeated in each page: five of the six views keep their filters in the
 * URL (contract §6), and a per-page wrapper meant five copies of the same
 * provider plus one route (`/timeline`) carrying an extra layout file just for it.
 *
 * NOT in `src/app/layout.tsx`: `(auth)/login` has no URL state and must stay free
 * of app-only providers.
 *
 * The app chrome is NOT here — `src/app/layout.tsx` mounts `<AppShell>` (sidebar
 * + topbar + `<main class="view">`) for every route and blanks it out on /login.
 * Each page keeps its own `<Suspense>` boundary so the skeleton matches the view
 * it is standing in for.
 */
export default function AppRoutesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}

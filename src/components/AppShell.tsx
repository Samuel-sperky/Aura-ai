"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/ui/Toast";
import { applyStoredPreferences } from "@/lib/theme";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ShellUser } from "./shellUser";

/**
 * Routes rendered WITHOUT the app chrome (no rail, no topbar): the login screen
 * has no navigation to offer. Matched as a prefix.
 */
const BARE_ROUTES = ["/login"] as const;

export interface AppShellProps {
  /** Resolved server-side by `currentShellUser()`; null when not signed in. */
  user: ShellUser | null;
  children: ReactNode;
}

/**
 * The application frame: sidebar + topbar + <main>, plus the toast region.
 * Mounted once in `src/app/layout.tsx` — pages never render their own shell.
 */
export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname() ?? "/";

  // The drawer remembers WHERE it was opened, so any route change closes it
  // without an effect + setState round trip.
  const [nav, setNav] = useState({ open: false, at: pathname });
  const navOpen = nav.open && nav.at === pathname;
  const openNav = () => setNav({ open: true, at: pathname });
  const closeNav = () => setNav({ open: false, at: pathname });

  // The pre-paint script in <head> already stamped the attributes; this is a
  // belt-and-braces pass for hydration edge cases (e.g. a cached HTML shell).
  useEffect(() => {
    applyStoredPreferences();
  }, []);

  const bare = BARE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  if (bare) {
    return (
      <ToastProvider>
        <main id="content">{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <a className="skip-link" href="#content">
        Preskočiť na obsah
      </a>
      <div className="app-shell">
        {navOpen ? (
          <div className="nav-overlay" role="presentation" onClick={closeNav} />
        ) : null}
        <Sidebar user={user} open={navOpen} onClose={closeNav} />
        <div className="main">
          <Topbar navOpen={navOpen} onOpenNav={openNav} />
          <main id="content" className="view">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

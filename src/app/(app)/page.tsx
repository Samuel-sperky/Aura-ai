// `/` — Prehľad.
//
// The route group `(app)` carries no layout of its own: `src/app/layout.tsx`
// already mounts `<AppShell>` (sidebar + topbar + <main class="view">), so a page
// renders content only. The group exists to keep the six application routes
// together and away from `(auth)`.
//
// The whole view is a client component: filters, modals and optimistic updates
// all live in the browser, and the data arrives over `/api/*` where `defineRoute`
// re-checks every right. This file stays a thin server shell so `next/headers`
// and the DB pool never reach the client bundle.

import type { Metadata } from "next";
import { OverviewView } from "@/components/overview";

export const metadata: Metadata = {
  title: "Prehľad",
  description:
    "Kľúčové čísla Aura Roadmap: stav projektov, otvorené checkpointy a aktívne šprinty.",
};

export default function OverviewPage() {
  return <OverviewView />;
}

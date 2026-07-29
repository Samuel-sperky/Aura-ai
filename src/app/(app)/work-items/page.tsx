// `/work-items` — Úlohy.
//
// Same shape as /projects: a thin server shell plus a `<Suspense>` boundary,
// because the view reads `useSearchParams` through `nuqs`. The adapter itself is
// mounted once in `(app)/layout.tsx`.

import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/states";
import { WorkItemsView } from "@/components/workItems";

export const metadata: Metadata = {
  title: "Úlohy",
  description:
    "Backlog a board Aura Roadmap: dve úrovne hierarchie, ručné poradie, komentáre a worklog.",
};

export default function WorkItemsPage() {
  return (
    <Suspense fallback={<LoadingState blocks={2} />}>
      <WorkItemsView />
    </Suspense>
  );
}

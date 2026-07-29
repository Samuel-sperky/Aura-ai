// `/projects` — the project register.
//
// `NuqsAdapter` comes from `(app)/layout.tsx`, mounted once for all six routes.
// `<Suspense>` still belongs HERE because the view reads `useSearchParams` through
// `nuqs`, which suspends during the initial render, and the fallback has to match
// this screen.

import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/states";
import { ProjectsView } from "@/components/projects";

export const metadata: Metadata = {
  title: "Projekty",
  description:
    "Evidencia projektov Aura Roadmap: tabuľka, karty, filtre a detail v modale.",
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingState blocks={2} />}>
      <ProjectsView />
    </Suspense>
  );
}

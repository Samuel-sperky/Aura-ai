// `/decisions` — the checkpoint decision queue.
//
// The view is co-located rather than living in `src/components/`: it is a single
// screen assembled from A8's timeline components, so there is nothing here for a
// second page to reuse.

import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/states";
import { DecisionsView } from "./DecisionsView";

export const metadata: Metadata = {
  title: "Rozhodnutia",
  description:
    "Fronta checkpointov Aura Roadmap podľa termínu, s pripravenosťou a schvaľovateľom.",
};

export default function DecisionsPage() {
  return (
    <Suspense fallback={<LoadingState kpis={4} blocks={2} />}>
      <DecisionsView />
    </Suspense>
  );
}

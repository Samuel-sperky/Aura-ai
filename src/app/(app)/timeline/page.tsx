import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthError, requireRight } from "@/lib/auth/rbac";
import { ForbiddenState, LoadingState } from "@/components/states";
import { PageHeader } from "@/components/ui";
import { TimelineWorkspace } from "@/components/timeline";

export const metadata: Metadata = { title: "Timeline" };

/**
 * /timeline — Roadmap · Šprinty · Rozhodnutia (contract §6).
 *
 * The right is checked HERE as well as in every API route: without it the page
 * would render a shell that then fails four requests, which reads as a bug rather
 * than as "you may not see this". Every mutation is still gated server-side —
 * this is the friendly front door, not the lock.
 *
 * `Suspense` is required because the workspace reads search params through
 * `nuqs`, which uses `useSearchParams()` underneath.
 */
export default async function TimelinePage() {
  try {
    await requireRight("timeline.read");
  } catch (err) {
    // ONLY an authorisation failure becomes "Nemáte prístup". A DB outage must
    // not be dressed up as a permission problem — rethrow it so the error
    // boundary reports what actually happened.
    if (!(err instanceof AuthError)) throw err;
    return <ForbiddenState />;
  }

  return (
    <Suspense
      fallback={
        <div className="page-stack">
          <PageHeader eyebrow="Plánovanie" title="Timeline" />
          <LoadingState kpis={3} blocks={2} />
        </div>
      }
    >
      <TimelineWorkspace />
    </Suspense>
  );
}

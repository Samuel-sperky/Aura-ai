// `/settings` — Nastavenia.

import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/states";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = {
  title: "Nastavenia",
  description:
    "Vzhľad, vlastný účet, používatelia, audit a stav záloh Aura Roadmap.",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState blocks={2} />}>
      <SettingsView />
    </Suspense>
  );
}

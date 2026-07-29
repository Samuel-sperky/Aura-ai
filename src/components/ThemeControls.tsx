"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Rows3, Rows4, Sun } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_DENSITY,
  DEFAULT_THEME,
  getDensity,
  getTheme,
  setDensity,
  setTheme,
  subscribePreferences,
} from "@/lib/theme";
import type { Density, ThemePref } from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "light" as ThemePref, label: "", icon: Sun, title: "Svetlá téma" },
  { value: "dark" as ThemePref, label: "", icon: Moon, title: "Tmavá téma" },
  { value: "system" as ThemePref, label: "", icon: Monitor, title: "Podľa systému" },
];

const DENSITY_OPTIONS = [
  { value: "cozy" as Density, label: "", icon: Rows3, title: "Pohodlná hustota" },
  { value: "compact" as Density, label: "", icon: Rows4, title: "Kompaktná hustota" },
];

const serverTheme = () => DEFAULT_THEME;
const serverDensity = () => DEFAULT_DENSITY;

/**
 * Shared hook for both controls. Reads the preference through
 * `useSyncExternalStore`, so the server renders the default, the client renders
 * the stored value, and a change in another tab (or the OS flipping while on
 * "system") re-renders without a setState-in-effect round trip.
 */
function usePreferences() {
  const theme = useSyncExternalStore(
    subscribePreferences,
    getTheme,
    serverTheme,
  );
  const density = useSyncExternalStore(
    subscribePreferences,
    getDensity,
    serverDensity,
  );

  return {
    theme,
    density,
    changeTheme: (next: ThemePref) => setTheme(next),
    changeDensity: (next: Density) => setDensity(next),
  };
}

/**
 * Compact icon toggle for the topbar: cycles light → dark → system.
 * The full three-way picker lives in Nastavenia → Vzhľad (`<ThemePicker/>`).
 */
export function ThemeToggle() {
  const { theme, changeTheme } = usePreferences();
  const next: ThemePref =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label =
    theme === "light" ? "Svetlá téma" : theme === "dark" ? "Tmavá téma" : "Podľa systému";
  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      icon={Icon}
      aria-label={`${label} — prepnúť`}
      title={label}
      onClick={() => changeTheme(next)}
    />
  );
}

// These are the ICON-ONLY topbar controls. Nastavenia → Vzhľad renders its own
// labelled pickers for the same two preferences, so on that page both exist at
// once. Their accessible names must differ: two tablists reading "Hustota
// zobrazenia" leave a screen-reader user unable to tell which one they are on
// (and made the e2e selector ambiguous, which is how this surfaced).

/** Compact three-way theme picker for the topbar. */
export function ThemePicker() {
  const { theme, changeTheme } = usePreferences();
  return (
    <Segmented
      ariaLabel="Téma — rýchle prepnutie"
      value={theme}
      onChange={changeTheme}
      options={THEME_OPTIONS}
    />
  );
}

/** Compact two-way density picker for the topbar. */
export function DensityPicker() {
  const { density, changeDensity } = usePreferences();
  return (
    <Segmented
      ariaLabel="Hustota zobrazenia — rýchle prepnutie"
      value={density}
      onChange={changeDensity}
      options={DENSITY_OPTIONS}
    />
  );
}

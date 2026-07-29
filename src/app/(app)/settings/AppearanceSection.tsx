"use client";

// Nastavenia → Vzhľad: theme, density, language.
//
// TWO STORES, ONE SOURCE OF TRUTH PER CONCERN:
//   * localStorage is what PAINTS. The pre-paint script in <head> reads it before
//     the first frame, which is what keeps the app from flashing the wrong theme.
//     `setTheme` / `setDensity` (A7) write it and stamp `<html>`.
//   * `user_view_preferences`' sibling table behind `PUT /api/preferences` is the
//     CROSS-DEVICE copy. It is written after the local one so the UI reacts
//     instantly and a failed request never blocks the visual change.
//
// The server copy is therefore read once on mount and applied only when it
// disagrees with what is stored locally AND the local value is still the default —
// otherwise switching the theme on this machine would be undone by another device.
//
// LANGUAGE is stored the same way but does not re-render the app yet: the runtime
// language provider is A10's. The hint says so out loud instead of pretending.

import { useCallback, useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import { Languages, Monitor, Moon, Rows3, Rows4, Sun } from "lucide-react";
import {
  Field,
  Panel,
  PanelBody,
  PanelHead,
  Segmented,
  Select,
  useToast,
} from "@/components/ui";
import { ApiError, apiGet, apiPut } from "@/lib/api";
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
import { LANG_STORAGE_KEY } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { UserPreferences } from "@/lib/domain/contracts/projects";
import { t } from "@/lib/i18n";

const serverTheme = () => DEFAULT_THEME;
const serverDensity = () => DEFAULT_DENSITY;

function storedLang(): Lang {
  try {
    const raw = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    return raw === "en" ? "en" : "sk";
  } catch {
    return "sk";
  }
}

function writeLang(lang: Lang): void {
  try {
    globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the server copy still records the choice.
  }
  try {
    globalThis.document?.documentElement.setAttribute("lang", lang);
  } catch {
    // No DOM (should not happen in a client component).
  }
}

export function AppearanceSection() {
  const toast = useToast();
  const theme = useSyncExternalStore(subscribePreferences, getTheme, serverTheme);
  const density = useSyncExternalStore(
    subscribePreferences,
    getDensity,
    serverDensity,
  );
  // Language has no external store yet, so it is plain state seeded after mount
  // (reading localStorage during render would be a hydration mismatch).
  const [lang, setLang] = useState<Lang>("sk");

  useEffect(() => {
    setLang(storedLang());
  }, []);

  // Adopt the server copy only where this browser still holds the default.
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<{ preferences: UserPreferences }>("/api/preferences", {
      signal: controller.signal,
    })
      .then(({ preferences }) => {
        if (!alive) return;
        if (getTheme() === DEFAULT_THEME && preferences.theme !== DEFAULT_THEME) {
          setTheme(preferences.theme);
        }
        if (
          getDensity() === DEFAULT_DENSITY &&
          preferences.density !== DEFAULT_DENSITY
        ) {
          setDensity(preferences.density);
        }
        if (storedLang() === "sk" && preferences.lang === "en") {
          writeLang("en");
          setLang("en");
        }
      })
      .catch(() => {
        // No stored preferences yet, or no right: the local values stand.
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const persist = useCallback(
    (patch: Partial<UserPreferences>) => {
      void apiPut("/api/preferences", patch).catch((err: unknown) => {
        toast.warn(
          err instanceof ApiError
            ? err.message
            : "Nastavenie sa uložilo len v tomto prehliadači.",
        );
      });
    },
    [toast],
  );

  const onTheme = useCallback(
    (next: ThemePref) => {
      setTheme(next);
      persist({ theme: next });
    },
    [persist],
  );

  const onDensity = useCallback(
    (next: Density) => {
      setDensity(next);
      persist({ density: next });
    },
    [persist],
  );

  const onLang = useCallback(
    (next: Lang) => {
      writeLang(next);
      setLang(next);
      persist({ lang: next });
    },
    [persist],
  );

  return (
    <Panel>
      <PanelHead
        icon={Sun}
        title={t("settings.section.appearance")}
        subtitle={t("settings.appearance.hint")}
      />
      <PanelBody>
        <Field label={t("appearance.theme")}>
          <Segmented
            ariaLabel={t("appearance.theme")}
            value={theme}
            onChange={onTheme}
            options={[
              {
                value: "system" as ThemePref,
                label: t("appearance.themeSystem"),
                icon: Monitor,
              },
              {
                value: "light" as ThemePref,
                label: t("appearance.themeLight"),
                icon: Sun,
              },
              {
                value: "dark" as ThemePref,
                label: t("appearance.themeDark"),
                icon: Moon,
              },
            ]}
          />
        </Field>

        <Field label={t("appearance.density")}>
          <Segmented
            ariaLabel={t("appearance.density")}
            value={density}
            onChange={onDensity}
            options={[
              {
                value: "cozy" as Density,
                label: t("appearance.densityCozy"),
                icon: Rows3,
              },
              {
                value: "compact" as Density,
                label: t("appearance.densityCompact"),
                icon: Rows4,
              },
            ]}
          />
        </Field>

        <Field
          label={t("appearance.language")}
          hint={t("settings.appearance.langHint")}
        >
          <span className="row">
            <Languages size={15} aria-hidden="true" className="muted" />
            <Select
              aria-label={t("appearance.language")}
              value={lang}
              options={[
                { value: "sk", label: t("settings.appearance.langSk") },
                { value: "en", label: t("settings.appearance.langEn") },
              ]}
              onChange={(e) => onLang(e.target.value === "en" ? "en" : "sk")}
            />
          </span>
        </Field>
      </PanelBody>
    </Panel>
  );
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DENSITY,
  DEFAULT_THEME,
  DENSITY_STORAGE_KEY,
  PREFERS_DARK_QUERY,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  applyStoredPreferences,
  getDensity,
  getResolvedTheme,
  getTheme,
  normalizeDensity,
  normalizeTheme,
  resolveTheme,
  setDensity,
  setTheme,
  subscribePreferences,
  systemPrefersDark,
  watchSystemTheme,
} from "./theme";

// The vitest environment is "node" (no jsdom in the project), so we install the
// three globals theme.ts touches. theme.ts reads them off globalThis on every
// call precisely so this works.

interface FakeRoot {
  attrs: Record<string, string>;
}

let fakeRoot: FakeRoot;
let listeners: Array<() => void>;
let prefersDark: boolean;
let windowListeners: Map<string, Set<(event: Event) => void>>;
let savedGlobals: Record<string, unknown>;

const PATCHED = [
  "localStorage",
  "document",
  "matchMedia",
  "window",
  "addEventListener",
  "removeEventListener",
  "dispatchEvent",
] as const;

function installDom(): void {
  fakeRoot = { attrs: {} };
  listeners = [];
  windowListeners = new Map();
  const store = new Map<string, string>();

  const g = globalThis as Record<string, unknown>;
  savedGlobals = {};
  for (const key of PATCHED) savedGlobals[key] = g[key];

  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          fakeRoot.attrs[name] = value;
        },
        getAttribute: (name: string) => fakeRoot.attrs[name] ?? null,
      },
    },
    matchMedia: (query: string) => ({
      media: query,
      get matches() {
        return prefersDark;
      },
      addEventListener: (_type: string, cb: () => void) => void listeners.push(cb),
      removeEventListener: (_type: string, cb: () => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
    }),
  });

  Object.assign(globalThis, {
    // THEME_SCRIPT runs in a browser, where it reaches matchMedia via `window`.
    window: globalThis,
    // Minimal EventTarget so the cross-tab `storage` path is testable in node.
    addEventListener: (type: string, cb: (event: Event) => void) => {
      const set = windowListeners.get(type) ?? new Set();
      set.add(cb);
      windowListeners.set(type, set);
    },
    removeEventListener: (type: string, cb: (event: Event) => void) => {
      windowListeners.get(type)?.delete(cb);
    },
    dispatchEvent: (event: Event) => {
      windowListeners.get(event.type)?.forEach((cb) => cb(event));
      return true;
    },
  });
}

function uninstallDom(): void {
  const g = globalThis as Record<string, unknown>;
  for (const key of PATCHED) {
    if (savedGlobals[key] === undefined) delete g[key];
    else g[key] = savedGlobals[key];
  }
}

beforeEach(() => {
  prefersDark = false;
  installDom();
});

afterEach(() => {
  uninstallDom();
  vi.restoreAllMocks();
});

describe("defaults", () => {
  it("is dark-first: no stored preference resolves to dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(getTheme()).toBe("dark");
    // ...even though the fake OS asks for light.
    expect(prefersDark).toBe(false);
    expect(getResolvedTheme()).toBe("dark");
  });

  it("defaults density to cozy", () => {
    expect(DEFAULT_DENSITY).toBe("cozy");
    expect(getDensity()).toBe("cozy");
  });

  it("falls back to dark for a garbage stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "solarized");
    expect(getTheme()).toBe("dark");
    expect(normalizeTheme(null)).toBe("dark");
    expect(normalizeTheme(42)).toBe("dark");
  });

  it("falls back to cozy for a garbage stored density", () => {
    localStorage.setItem(DENSITY_STORAGE_KEY, "spacious");
    expect(getDensity()).toBe("cozy");
    expect(normalizeDensity(undefined)).toBe("cozy");
  });

  it("stays dark-first when matchMedia is unavailable", () => {
    delete (globalThis as Record<string, unknown>).matchMedia;
    expect(systemPrefersDark()).toBe(true);
    expect(resolveTheme("system", systemPrefersDark())).toBe("dark");
  });
});

describe("explicit preferences", () => {
  it("resolves light and dark to themselves", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("persists and stamps the preference on <html>", () => {
    setTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(fakeRoot.attrs["data-theme"]).toBe("light");

    setTheme("dark");
    expect(getTheme()).toBe("dark");
    expect(fakeRoot.attrs["data-theme"]).toBe("dark");
  });

  it("normalizes an invalid value on write instead of storing it", () => {
    setTheme("neon" as never);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});

describe('"system" follows matchMedia', () => {
  it("resolves to light when the OS prefers light", () => {
    prefersDark = false;
    setTheme("system");
    expect(getTheme()).toBe("system");
    expect(getResolvedTheme()).toBe("light");
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
  });

  it("resolves to dark when the OS prefers dark", () => {
    prefersDark = true;
    setTheme("system");
    expect(getResolvedTheme()).toBe("dark");
    expect(fakeRoot.attrs["data-theme"]).toBe("dark");
  });

  it("re-stamps <html> when the OS flips while on system", () => {
    prefersDark = false;
    setTheme("system");
    const stop = watchSystemTheme();
    expect(fakeRoot.attrs["data-theme"]).toBe("light");

    prefersDark = true;
    listeners.forEach((l) => l());
    expect(fakeRoot.attrs["data-theme"]).toBe("dark");

    stop();
    expect(listeners).toHaveLength(0);
  });

  it("ignores OS changes once an explicit theme is picked", () => {
    prefersDark = false;
    setTheme("system");
    watchSystemTheme();
    setTheme("light");

    prefersDark = true;
    listeners.forEach((l) => l());
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
  });
});

describe("density round-trip", () => {
  it("survives write → read → apply", () => {
    setDensity("compact");
    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
    expect(getDensity()).toBe("compact");
    expect(fakeRoot.attrs["data-density"]).toBe("compact");

    setDensity("cozy");
    expect(getDensity()).toBe("cozy");
    expect(fakeRoot.attrs["data-density"]).toBe("cozy");
  });

  it("applyStoredPreferences stamps both axes at once", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    applyStoredPreferences();
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
    expect(fakeRoot.attrs["data-density"]).toBe("compact");
  });
});

describe("subscribePreferences (external store for React)", () => {
  it("notifies on setTheme and setDensity in this tab", () => {
    const spy = vi.fn();
    const stop = subscribePreferences(spy);
    setTheme("light");
    setDensity("compact");
    expect(spy).toHaveBeenCalledTimes(2);
    stop();
    setTheme("dark");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("notifies (and re-stamps) on a storage event from another tab", () => {
    const spy = vi.fn();
    const stop = subscribePreferences(spy);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    const event = new Event("storage") as Event & { key?: string };
    event.key = THEME_STORAGE_KEY;
    globalThis.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
    stop();
  });

  it("ignores unrelated storage keys", () => {
    const spy = vi.fn();
    const stop = subscribePreferences(spy);
    const event = new Event("storage") as Event & { key?: string };
    event.key = "some_other_app_key";
    globalThis.dispatchEvent(event);
    expect(spy).not.toHaveBeenCalled();
    stop();
  });
});

describe("blocked storage", () => {
  it("still applies the theme when localStorage throws", () => {
    Object.assign(globalThis, {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => setTheme("light")).not.toThrow();
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
  });
});

describe("THEME_SCRIPT (pre-paint)", () => {
  it("references both storage keys and the media query", () => {
    expect(THEME_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_SCRIPT).toContain(DENSITY_STORAGE_KEY);
    expect(THEME_SCRIPT).toContain(PREFERS_DARK_QUERY);
  });

  it("stamps both attributes and defaults to dark/cozy", () => {
    expect(THEME_SCRIPT).toContain("data-theme");
    expect(THEME_SCRIPT).toContain("data-density");
    expect(THEME_SCRIPT).toContain(`"${DEFAULT_THEME}"`);
    expect(THEME_SCRIPT).toContain(`"${DEFAULT_DENSITY}"`);
  });

  it("is a self-invoking one-liner with no closing script tag", () => {
    expect(THEME_SCRIPT.startsWith("(function()")).toBe(true);
    expect(THEME_SCRIPT).not.toContain("</script");
    expect(THEME_SCRIPT).not.toContain("\n");
  });

  it("actually resolves dark → light → system against a fake DOM", () => {
    // Run the real script text; it must behave exactly like the TS helpers.
    const run = new Function(THEME_SCRIPT);

    run();
    expect(fakeRoot.attrs["data-theme"]).toBe("dark");
    expect(fakeRoot.attrs["data-density"]).toBe("cozy");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    run();
    expect(fakeRoot.attrs["data-theme"]).toBe("light");
    expect(fakeRoot.attrs["data-density"]).toBe("compact");

    localStorage.setItem(THEME_STORAGE_KEY, "system");
    prefersDark = true;
    run();
    expect(fakeRoot.attrs["data-theme"]).toBe("dark");
  });
});

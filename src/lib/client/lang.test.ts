import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LANG_STORAGE_KEY } from "@/lib/i18n";
import {
  getLang,
  getLangOnServer,
  normalizeLang,
  setLang,
  subscribeLang,
} from "./lang";

// The vitest environment is "node" (there is no jsdom in the project), so the two
// globals lang.ts touches are installed by hand. lang.ts reads them off
// globalThis on every call precisely so this works — the same arrangement as
// theme.test.ts, which covers the sibling theme/density store.

interface FakeRoot {
  attrs: Record<string, string>;
}

let fakeRoot: FakeRoot;
let windowListeners: Map<string, Set<(event: Event) => void>>;
let savedGlobals: Record<string, unknown>;

const PATCHED = [
  "localStorage",
  "document",
  "addEventListener",
  "removeEventListener",
  "dispatchEvent",
] as const;

function installDom(): void {
  fakeRoot = { attrs: {} };
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

/** A cross-tab write, as the browser reports it. */
function fireStorage(key: string): void {
  const event = new Event("storage") as Event & { key: string };
  event.key = key;
  globalThis.dispatchEvent(event);
}

beforeEach(installDom);
afterEach(uninstallDom);

describe("normalizeLang", () => {
  it("keeps the one non-default language", () => {
    expect(normalizeLang("en")).toBe("en");
  });

  it("falls back to sk for anything else", () => {
    expect(normalizeLang("sk")).toBe("sk");
    expect(normalizeLang(null)).toBe("sk");
    expect(normalizeLang(undefined)).toBe("sk");
    expect(normalizeLang("de")).toBe("sk");
    expect(normalizeLang(42)).toBe("sk");
  });
});

describe("read / write", () => {
  it("defaults to sk with nothing stored", () => {
    expect(getLang()).toBe("sk");
  });

  it("persists the preference and stamps <html lang>", () => {
    setLang("en");
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("en");
    expect(getLang()).toBe("en");
    expect(fakeRoot.attrs.lang).toBe("en");

    setLang("sk");
    expect(getLang()).toBe("sk");
    expect(fakeRoot.attrs.lang).toBe("sk");
  });

  it("normalizes an invalid value on write instead of storing it", () => {
    setLang("klingon" as never);
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("sk");
  });

  it("falls back to sk for a garbage stored value", () => {
    localStorage.setItem(LANG_STORAGE_KEY, "pirate");
    expect(getLang()).toBe("sk");
  });

  it("renders the default on the server, so hydration matches", () => {
    localStorage.setItem(LANG_STORAGE_KEY, "en");
    expect(getLangOnServer()).toBe("sk");
    expect(getLang()).toBe("en");
  });

  it("survives a blocked localStorage", () => {
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
    // Reading throws inside the store and must degrade to the default; writing
    // must still stamp the document.
    expect(() => setLang("en")).not.toThrow();
    expect(fakeRoot.attrs.lang).toBe("en");
  });
});

describe("subscribeLang", () => {
  it("notifies on a local write and stops after unsubscribing", () => {
    let calls = 0;
    const unsubscribe = subscribeLang(() => {
      calls += 1;
    });

    setLang("en");
    expect(calls).toBe(1);

    unsubscribe();
    setLang("sk");
    expect(calls).toBe(1);
  });

  it("notifies on another tab's write to the language key only", () => {
    let calls = 0;
    const unsubscribe = subscribeLang(() => {
      calls += 1;
    });

    fireStorage("aura_roadmap_theme");
    expect(calls).toBe(0);

    fireStorage(LANG_STORAGE_KEY);
    expect(calls).toBe(1);

    unsubscribe();
    fireStorage(LANG_STORAGE_KEY);
    expect(calls).toBe(1);
  });

  it("supports several subscribers at once", () => {
    const seen: string[] = [];
    const stopA = subscribeLang(() => void seen.push("a"));
    const stopB = subscribeLang(() => void seen.push("b"));

    setLang("en");
    expect(seen).toEqual(["a", "b"]);

    stopA();
    stopB();
  });
});

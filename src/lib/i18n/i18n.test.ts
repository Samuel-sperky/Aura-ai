/**
 * i18n tests: every key has both SK and EN, no duplicates, `t()` resolves and
 * interpolates, and the language switch holds.
 */

import { describe, it, expect } from "vitest";
// Number/date formatting is NOT tested here any more: it lives in
// `@/lib/client/format` (the module the views actually import) and is covered by
// `src/lib/client/format.test.ts`. The duplicate formatters this file used to
// exercise were unreachable from the UI and have been removed.
import { KEYS, t, setLang, getLang } from ".";

describe("i18n", () => {
  describe("KEYS completeness", () => {
    it("every key has both sk and en", () => {
      const issues: string[] = [];

      for (const [key, entry] of Object.entries(KEYS)) {
        if (!entry.sk) issues.push(`${key}: missing SK`);
        if (!entry.en) issues.push(`${key}: missing EN`);
      }

      expect(issues, issues.join("; ")).toHaveLength(0);
    });

    it("no duplicate keys across modules", () => {
      const keys = Object.keys(KEYS);
      const unique = new Set(keys);
      expect(keys).toHaveLength(unique.size);
    });
  });

  describe("t() function", () => {
    it("returns SK by default", () => {
      expect(t("auth.login.title")).toBe("Prihlásenie");
    });

    it("returns EN when lang is set", () => {
      setLang("en");
      expect(t("auth.login.title")).toBe("Sign in");
      setLang("sk"); // reset
    });

    it("returns the key itself when not found (dev fallback)", () => {
      expect(t("nonexistent.key")).toBe("nonexistent.key");
    });

    it("substitutes variables: {n}", () => {
      setLang("sk");
      const result = t("checkpoints.dueInDays", { n: 5 });
      expect(result).toBe("Za 5 dní");
    });
  });

  describe("language switching", () => {
    it("getLang returns the current language", () => {
      expect(getLang()).toBe("sk");
      setLang("en");
      expect(getLang()).toBe("en");
      setLang("sk"); // reset
    });
  });

});

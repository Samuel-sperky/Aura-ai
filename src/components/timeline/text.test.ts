import { describe, expect, it } from "vitest";
import { ROADMAP_HORIZON, type TimelineZoom } from "@/lib/timeline";
import { pluralForm, t } from "./text";

describe("pluralForm — Slovak buckets", () => {
  it("puts 1 in `one`", () => {
    expect(pluralForm(1)).toBe("one");
  });

  it("puts 2–4 in `few`", () => {
    expect([2, 3, 4].map(pluralForm)).toEqual(["few", "few", "few"]);
  });

  it("puts 0 and 5+ in `many`", () => {
    expect([0, 5, 8, 12, 53, 100].map(pluralForm)).toEqual(
      ["many", "many", "many", "many", "many", "many"],
    );
  });
});

describe("t — variable substitution", () => {
  it("fills {n} in a horizon unit label", () => {
    expect(t("timeline.horizonUnits.month.many", { n: 12 })).toBe("12 mesiacov");
  });

  it("leaves a key with no placeholder untouched", () => {
    expect(t("timeline.horizon", { n: 3 })).toBe("Horizont");
  });

  it("renders an unknown key as itself", () => {
    expect(t("timeline.doesNotExist")).toBe("timeline.doesNotExist");
  });
});

describe("roadmap axis hint — every zoom has a truthful label", () => {
  // The bug this guards: the hint used to be the constant "12 mesiacov", which was
  // false at `quarter` (8 quarters) and at `week` (12 weeks). The label must be
  // composed from the horizon the axis is actually drawn from.
  const EXPECTED: Record<TimelineZoom, string> = {
    quarter: "8 kvartálov",
    month: "12 mesiacov",
    week: "12 týždňov",
  };

  for (const zoom of ["quarter", "month", "week"] as const) {
    it(`describes ${zoom} as "${EXPECTED[zoom]}"`, () => {
      const units = ROADMAP_HORIZON[zoom];
      const label = t(`timeline.horizonUnits.${zoom}.${pluralForm(units)}`, {
        n: units,
      });
      expect(label).toBe(EXPECTED[zoom]);
      // A missing key renders as itself; that must never reach the axis header.
      expect(label).not.toContain("timeline.");
      expect(label).not.toContain("{n}");
    });
  }

  it("has all three plural forms for all three units", () => {
    for (const zoom of ["quarter", "month", "week"] as const) {
      for (const form of ["one", "few", "many"] as const) {
        const key = `timeline.horizonUnits.${zoom}.${form}`;
        expect(t(key, { n: 1 }), key).not.toBe(key);
      }
    }
  });
});

// `@/lib/client/format` is THE formatting module: 17 view files render every
// number, percentage, delta, date and duration through it, and until now it had no
// tests at all (the coverage lived on a duplicate set of formatters in
// `@/lib/i18n` that nothing imported — those are gone, these moved here).
//
// Runs under TZ=Europe/Bratislava (vitest.config.ts), which is what makes the
// calendar-day cases real guards rather than tautologies.

import { describe, it, expect } from "vitest";
import {
  EM_DASH,
  NBSP,
  dayWord,
  daysUntil,
  dueLabel,
  fmtDate,
  fmtDateTime,
  fmtDayMonth,
  fmtInt,
  fmtMinutes,
  fmtNumber,
  fmtPercent,
  fmtRollupPoints,
  fmtSigned,
  plural,
  todayIso,
} from "./format";

describe("fmtInt", () => {
  it("groups thousands with a NON-BREAKING space (sk-SK)", () => {
    const out = fmtInt(12345);
    expect(out).toBe(`12${NBSP}345`);
    // A plain space here would let a table cell wrap mid-number.
    expect(out).not.toContain(" ");
  });

  it("rounds to a whole number", () => {
    expect(fmtInt(41.6)).toBe("42");
    expect(fmtInt("7")).toBe("7");
  });

  it("renders the em dash for a non-numeric value", () => {
    expect(fmtInt("abc")).toBe(EM_DASH);
    expect(fmtInt(Number.NaN)).toBe(EM_DASH);
    expect(fmtInt(Number.POSITIVE_INFINITY)).toBe(EM_DASH);
  });

  it("renders the em dash for ABSENT values, never a confident 0", () => {
    // Regression guard: `Number(null)` and `Number("")` are both 0 and pass
    // Number.isFinite, so an unestimated field used to display as "0" — i.e. "no
    // estimate" was shown as "estimated at zero".
    expect(fmtInt(null)).toBe(EM_DASH);
    expect(fmtInt(undefined)).toBe(EM_DASH);
    expect(fmtInt("")).toBe(EM_DASH);
    expect(fmtInt("   ")).toBe(EM_DASH);
    expect(fmtInt(true)).toBe(EM_DASH);
  });

  it("keeps 0 as a real value rather than 'no data'", () => {
    expect(fmtInt(0)).toBe("0");
  });
});

describe("fmtNumber", () => {
  it("uses a decimal COMMA and the requested precision", () => {
    expect(fmtNumber(1234.56, 2)).toBe(`1${NBSP}234,56`);
    expect(fmtNumber(3, 1)).toBe("3,0");
  });

  it("falls back to the em dash for an absent value", () => {
    expect(fmtNumber(null)).toBe(EM_DASH);
    expect(fmtNumber(undefined)).toBe(EM_DASH);
    expect(fmtNumber("")).toBe(EM_DASH);
  });
});

describe("fmtPercent", () => {
  it("treats the input as whole percent and spaces the % with NBSP", () => {
    expect(fmtPercent(50)).toBe(`50${NBSP}%`);
    expect(fmtPercent(66.6)).toBe(`67${NBSP}%`);
    expect(fmtPercent(66.6, 1)).toBe(`66,6${NBSP}%`);
  });

  it("renders 0 % rather than the em dash", () => {
    expect(fmtPercent(0)).toBe(`0${NBSP}%`);
  });
});

describe("fmtSigned", () => {
  it("always carries a sign, and 0 is neither a gain nor a loss", () => {
    expect(fmtSigned(5)).toBe("+5");
    expect(fmtSigned(-5)).toBe("-5");
    expect(fmtSigned(0)).toBe("0");
  });

  it("keeps the sign outside the grouped magnitude", () => {
    expect(fmtSigned(-1234)).toBe(`-1${NBSP}234`);
  });
});

describe("fmtRollupPoints", () => {
  it("shows the subtask breakdown as `5 (3+2)` (spec Q26)", () => {
    expect(fmtRollupPoints(5, 2, 1)).toBe("5 (3+2)");
  });

  it("shows a bare total when there are no subtasks", () => {
    expect(fmtRollupPoints(5, 0, 0)).toBe("5");
  });

  it("never shows a negative own share", () => {
    expect(fmtRollupPoints(2, 5, 2)).toBe("2 (0+5)");
  });
});

describe("calendar dates", () => {
  it("renders a YYYY-MM-DD day without ever touching the timezone", () => {
    // `new Date("2026-07-28")` is UTC midnight; routing through it would print
    // the 27th in any negative-offset zone. String surgery cannot drift.
    expect(fmtDate("2026-07-28")).toBe("28. 7. 2026");
    expect(fmtDate("2026-01-01")).toBe("1. 1. 2026");
    expect(fmtDate("2026-12-31T23:59:59Z")).toBe("31. 12. 2026");
  });

  it("renders the short day/month form", () => {
    expect(fmtDayMonth("2026-07-28")).toBe("28. 7.");
  });

  it("returns the em dash for empty or malformed input", () => {
    expect(fmtDate(null)).toBe(EM_DASH);
    expect(fmtDate("")).toBe(EM_DASH);
    expect(fmtDate("28.7.2026")).toBe(EM_DASH);
    expect(fmtDayMonth(undefined)).toBe(EM_DASH);
  });
});

describe("fmtDateTime", () => {
  it("renders an ISO instant in local time with zero-padded minutes", () => {
    // 2026-07-28T12:05:00Z is 14:05 in Europe/Bratislava (CEST, +2).
    expect(fmtDateTime("2026-07-28T12:05:00Z")).toBe("28. 7. 2026, 14:05");
  });

  it("returns the em dash for an unparseable instant", () => {
    expect(fmtDateTime("nope")).toBe(EM_DASH);
    expect(fmtDateTime(null)).toBe(EM_DASH);
  });
});

describe("fmtMinutes", () => {
  it("renders hours and minutes with NBSP units", () => {
    expect(fmtMinutes(200)).toBe(`3${NBSP}h 20${NBSP}min`);
    expect(fmtMinutes(120)).toBe(`2${NBSP}h`);
    expect(fmtMinutes(45)).toBe(`45${NBSP}min`);
  });

  it("renders 0 as `0 min`, never as an em dash", () => {
    expect(fmtMinutes(0)).toBe(`0${NBSP}min`);
  });

  it("clamps negatives and rejects non-numbers", () => {
    expect(fmtMinutes(-30)).toBe(`0${NBSP}min`);
    expect(fmtMinutes(null)).toBe(EM_DASH);
  });
});

describe("todayIso", () => {
  it("uses LOCAL civil parts, not the UTC day", () => {
    // 23:30 local on the 28th is already the 29th in UTC; the worklog default
    // date has to stay the 28th.
    expect(todayIso(new Date(2026, 6, 28, 23, 30))).toBe("2026-07-28");
    expect(todayIso(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("daysUntil", () => {
  it("counts whole days, negative once the day has passed", () => {
    expect(daysUntil("2026-07-31", "2026-07-28")).toBe(3);
    expect(daysUntil("2026-07-28", "2026-07-28")).toBe(0);
    expect(daysUntil("2026-07-26", "2026-07-28")).toBe(-2);
  });

  it("crosses a month and a DST boundary without drifting", () => {
    expect(daysUntil("2026-08-01", "2026-07-31")).toBe(1);
    // Europe/Bratislava leaves DST on 2026-10-25; the UTC-anchored maths must
    // not turn that into 0 or 2 days.
    expect(daysUntil("2026-10-26", "2026-10-25")).toBe(1);
  });

  it("returns null for absent or malformed days", () => {
    expect(daysUntil(null, "2026-07-28")).toBeNull();
    expect(daysUntil("nope", "2026-07-28")).toBeNull();
  });
});

describe("dueLabel", () => {
  it("says dnes / za N dní / po termíne N dní with Slovak plurals", () => {
    expect(dueLabel("2026-07-28", "2026-07-28")).toBe("dnes");
    expect(dueLabel("2026-07-29", "2026-07-28")).toBe(`za 1${NBSP}deň`);
    expect(dueLabel("2026-07-31", "2026-07-28")).toBe(`za 3${NBSP}dni`);
    expect(dueLabel("2026-08-04", "2026-07-28")).toBe(`za 7${NBSP}dní`);
    expect(dueLabel("2026-07-26", "2026-07-28")).toBe(`po termíne 2${NBSP}dni`);
  });

  it("returns the em dash when there is no due date", () => {
    expect(dueLabel(null, "2026-07-28")).toBe(EM_DASH);
  });
});

describe("Slovak plurals", () => {
  it("dayWord picks deň / dni / dní on the 1 · 2–4 · 5+ boundaries", () => {
    expect(dayWord(1)).toBe("deň");
    expect(dayWord(2)).toBe("dni");
    expect(dayWord(4)).toBe("dni");
    expect(dayWord(5)).toBe("dní");
    expect(dayWord(0)).toBe("dní");
    // The sign must not change the word.
    expect(dayWord(-3)).toBe("dni");
  });

  it("plural applies the same rule to any triple", () => {
    expect(plural(1, "položka", "položky", "položiek")).toBe("položka");
    expect(plural(3, "položka", "položky", "položiek")).toBe("položky");
    expect(plural(11, "položka", "položky", "položiek")).toBe("položiek");
  });
});

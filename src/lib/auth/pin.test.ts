// Password hashing + lockout. The DB is mocked (unit test, no MariaDB), but the
// argon2id hashing is REAL — the round-trip is the whole point.

import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import {
  MIN_PASSWORD_LENGTH,
  MAX_FAILED_ATTEMPTS,
  MAX_FAILED_ATTEMPTS_PER_USER,
  LOCKOUT_WINDOW_MINUTES,
  PasswordPolicyError,
  clearAllFailedAttempts,
  clearFailedAttempts,
  hashPassword,
  isLockedByCounts,
  isLockedOut,
  passwordPolicyError,
  recentFailedAttempts,
  recentFailedAttemptsForUser,
  recordAttempt,
  verifyPassword,
} from "./pin";

beforeEach(() => {
  db.query.mockReset();
  db.execute.mockReset();
  db.execute.mockResolvedValue({ affectedRows: 1, insertId: 0, warningStatus: 0 });
});

describe("password policy", () => {
  it("requires at least 10 characters (contract)", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(passwordPolicyError("123456789")).toMatch(/aspoň 10/);
    expect(passwordPolicyError("1234567890")).toBeNull();
  });

  it("rejects an over-long password", () => {
    expect(passwordPolicyError("x".repeat(257))).toMatch(/príliš dlhé/);
  });

  it("is enforced by hashPassword itself, not only by zod", async () => {
    await expect(hashPassword("short")).rejects.toBeInstanceOf(
      PasswordPolicyError,
    );
    // Nothing may be written when the policy rejects.
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("argon2id hash / verify", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("spravne-heslo-2026");
    // Encoded argon2id hash with the contract-mandated parameters.
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toContain("m=19456,t=2,p=1");
    expect(await verifyPassword(hash, "spravne-heslo-2026")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("spravne-heslo-2026");
    expect(await verifyPassword(hash, "spravne-heslo-2025")).toBe(false);
  });

  it("produces a different hash for the same password (per-hash salt)", async () => {
    const a = await hashPassword("rovnake-heslo-2026");
    const b = await hashPassword("rovnake-heslo-2026");
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "rovnake-heslo-2026")).toBe(true);
    expect(await verifyPassword(b, "rovnake-heslo-2026")).toBe(true);
  });

  it("returns false (never throws) for a missing or malformed hash", async () => {
    expect(await verifyPassword(null, "cokolvek-dlhe")).toBe(false);
    expect(await verifyPassword(undefined, "cokolvek-dlhe")).toBe(false);
    expect(await verifyPassword("", "cokolvek-dlhe")).toBe(false);
    expect(await verifyPassword("not-a-hash", "cokolvek-dlhe")).toBe(false);
  });
});

describe("attempt log", () => {
  it("records an attempt with the success flag as 0/1", async () => {
    await recordAttempt("a@b.sk", "1.2.3.4", false);
    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("auth_attempts"), [
      "a@b.sk",
      "1.2.3.4",
      0,
    ]);

    db.execute.mockClear();
    await recordAttempt("a@b.sk", "1.2.3.4", true);
    expect(db.execute).toHaveBeenCalledWith(expect.any(String), [
      "a@b.sk",
      "1.2.3.4",
      1,
    ]);
  });

  it("counts failures inside the window per (email, ip) and per email", async () => {
    db.query.mockResolvedValue([{ c: 3 }]);

    expect(await recentFailedAttempts("a@b.sk", "1.2.3.4")).toBe(3);
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("ip = ?"), [
      "a@b.sk",
      "1.2.3.4",
      LOCKOUT_WINDOW_MINUTES,
    ]);

    expect(await recentFailedAttemptsForUser("a@b.sk")).toBe(3);
    expect(db.query).toHaveBeenLastCalledWith(expect.any(String), [
      "a@b.sk",
      LOCKOUT_WINDOW_MINUTES,
    ]);
  });

  it("treats an empty count result as zero", async () => {
    db.query.mockResolvedValue([]);
    expect(await recentFailedAttempts("a@b.sk", "ip")).toBe(0);
  });

  it("clears failed attempts per (email, ip) and globally", async () => {
    await clearFailedAttempts("a@b.sk", "1.2.3.4");
    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("ip = ?"), [
      "a@b.sk",
      "1.2.3.4",
    ]);

    db.execute.mockClear();
    await clearAllFailedAttempts("a@b.sk");
    expect(db.execute).toHaveBeenCalledWith(expect.any(String), ["a@b.sk"]);
  });
});

describe("lockout ceilings", () => {
  it("uses the contract values", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(MAX_FAILED_ATTEMPTS_PER_USER).toBe(15);
    expect(LOCKOUT_WINDOW_MINUTES).toBe(15);
  });

  it("locks at the per-(email, ip) ceiling, not before", () => {
    expect(isLockedByCounts(4, 4)).toBe(false);
    expect(isLockedByCounts(5, 0)).toBe(true);
    expect(isLockedByCounts(6, 0)).toBe(true);
  });

  it("locks at the IP-independent per-email ceiling even with a rotating IP", () => {
    // Each individual IP stayed under 5, but the account saw 15 failures.
    expect(isLockedByCounts(1, 15)).toBe(true);
    expect(isLockedByCounts(1, 14)).toBe(false);
  });

  it("isLockedOut consults BOTH counters", async () => {
    // 3 params → per-(email, ip); 2 params → per-email.
    db.query.mockImplementation(async (_sql: string, params: unknown[]) =>
      params.length === 3 ? [{ c: 1 }] : [{ c: 15 }],
    );
    expect(await isLockedOut("a@b.sk", "1.2.3.4")).toBe(true);
    expect(db.query).toHaveBeenCalledTimes(2);

    db.query.mockImplementation(async (_sql: string, params: unknown[]) =>
      params.length === 3 ? [{ c: 5 }] : [{ c: 5 }],
    );
    expect(await isLockedOut("a@b.sk", "1.2.3.4")).toBe(true);

    db.query.mockImplementation(async () => [{ c: 0 }]);
    expect(await isLockedOut("a@b.sk", "1.2.3.4")).toBe(false);
  });

  it("has NO localhost exemption (the reference app's dev backdoor is not ported)", async () => {
    db.query.mockResolvedValue([{ c: MAX_FAILED_ATTEMPTS }]);
    expect(await isLockedOut("a@b.sk", "127.0.0.1")).toBe(true);
    expect(await isLockedOut("a@b.sk", "::1")).toBe(true);
  });
});

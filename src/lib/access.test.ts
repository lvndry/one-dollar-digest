/// <reference types="bun-types" />
import { afterAll, beforeAll, describe, expect, test, setSystemTime } from "bun:test";
import {
  canAccessApiDigestDate,
  canAccessArchive,
  canAccessDigestDate,
  trialDaysRemaining,
} from "./access";
import type { Session } from "next-auth";

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-05-03T12:00:00.000Z");

beforeAll(() => setSystemTime(FIXED_NOW));
afterAll(() => setSystemTime());

function makeSession(overrides: {
  subscribed?: boolean;
  createdAt?: Date | null;
}): Session {
  return {
    user: {
      id: "user-1",
      email: "test@example.com",
      subscribed: overrides.subscribed ?? false,
      createdAt: overrides.createdAt ?? null,
    },
    expires: new Date(FIXED_NOW.getTime() + 86400_000).toISOString(),
  };
}

describe("canAccessArchive", () => {
  test("returns false for null session", () => {
    expect(canAccessArchive(null)).toBe(false);
  });

  test("returns true for subscribed user", () => {
    const session = makeSession({ subscribed: true, createdAt: new Date(0) });
    expect(canAccessArchive(session)).toBe(true);
  });

  test("returns true for user within trial window", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - TRIAL_MS + 60_000);
    const session = makeSession({ subscribed: false, createdAt });
    expect(canAccessArchive(session)).toBe(true);
  });

  test("returns false for user past trial window", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - TRIAL_MS - 1000);
    const session = makeSession({ subscribed: false, createdAt });
    expect(canAccessArchive(session)).toBe(false);
  });

  test("returns false for user with no createdAt", () => {
    const session = makeSession({ subscribed: false, createdAt: null });
    expect(canAccessArchive(session)).toBe(false);
  });
});

describe("canAccessDigestDate", () => {
  const today = FIXED_NOW.toISOString().split("T")[0]!;

  test("today's digest is always accessible without session", () => {
    expect(canAccessDigestDate(today, null)).toBe(true);
  });

  test("past date is inaccessible without session", () => {
    expect(canAccessDigestDate("2024-01-01", null)).toBe(false);
  });

  test("past date is accessible for subscribed user", () => {
    const session = makeSession({ subscribed: true, createdAt: new Date(0) });
    expect(canAccessDigestDate("2024-01-01", session)).toBe(true);
  });

  test("past date is accessible during trial", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - TRIAL_MS + 60_000);
    const session = makeSession({ subscribed: false, createdAt });
    expect(canAccessDigestDate("2024-01-01", session)).toBe(true);
  });

  test("past date is inaccessible after trial expires", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - TRIAL_MS - 1000);
    const session = makeSession({ subscribed: false, createdAt });
    expect(canAccessDigestDate("2024-01-01", session)).toBe(false);
  });

  test("past date is accessible with subscribed API key user", () => {
    expect(canAccessDigestDate("2024-01-01", null, { subscribed: true })).toBe(true);
  });

  test("past date is inaccessible with non-subscribed API key user", () => {
    expect(canAccessDigestDate("2024-01-01", null, { subscribed: false })).toBe(false);
  });
});

describe("canAccessApiDigestDate", () => {
  const today = FIXED_NOW.toISOString().split("T")[0]!;

  test("requires a key even for today's free digest", () => {
    expect(canAccessApiDigestDate(today, null)).toBe(false);
  });

  test("allows today's digest with a free API key", () => {
    expect(canAccessApiDigestDate(today, { subscribed: false })).toBe(true);
  });

  test("denies archive access with a free API key", () => {
    expect(canAccessApiDigestDate("2024-01-01", { subscribed: false })).toBe(false);
  });

  test("allows archive access with a Premium API key", () => {
    expect(canAccessApiDigestDate("2024-01-01", { subscribed: true })).toBe(true);
  });
});

describe("trialDaysRemaining", () => {
  test("returns 0 for null session", () => {
    expect(trialDaysRemaining(null)).toBe(0);
  });

  test("returns 0 for session without createdAt", () => {
    const session = makeSession({ createdAt: null });
    expect(trialDaysRemaining(session)).toBe(0);
  });

  test("returns 3 at the start of the trial", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 60_000);
    const session = makeSession({ createdAt });
    expect(trialDaysRemaining(session)).toBe(3);
  });

  test("returns 0 after trial expires", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - TRIAL_MS - 1000);
    const session = makeSession({ createdAt });
    expect(trialDaysRemaining(session)).toBe(0);
  });

  test("returns 1 with one day remaining", () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000 - 60_000);
    const session = makeSession({ createdAt });
    expect(trialDaysRemaining(session)).toBe(1);
  });
});

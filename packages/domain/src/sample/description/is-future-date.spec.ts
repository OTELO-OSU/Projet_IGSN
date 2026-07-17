import { describe, expect, it } from "vitest";

import { isFutureDate } from "./is-future-date.ts";

const DAY_MS = 86_400_000;
const UTC14_MS = 14 * 3_600_000;

// Calendar day at UTC+14, the rule's anchor (see is-future-date.ts), shifted
// by whole days so every case is deterministic in any timezone.
function anywhereIso(daysFromToday: number): string {
  return new Date(Date.now() + UTC14_MS + daysFromToday * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// The machine's local calendar day: the regression the rule exists for (a
// user ahead of UTC entering their local today must never be rejected).
function localIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("isFutureDate", () => {
  it("should reject dates past the last today on Earth", () => {
    expect(isFutureDate(anywhereIso(1))).toBe(true);
    expect(isFutureDate("9999-01-01")).toBe(true);
  });

  it("should accept today everywhere and the past", () => {
    expect(isFutureDate(anywhereIso(0))).toBe(false);
    expect(isFutureDate(localIso())).toBe(false);
    expect(isFutureDate(anywhereIso(-1))).toBe(false);
    expect(isFutureDate("1998-07-12")).toBe(false);
  });
});

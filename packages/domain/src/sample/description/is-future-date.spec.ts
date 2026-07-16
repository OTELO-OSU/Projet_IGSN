import { describe, expect, it } from "vitest";

import { isFutureDate } from "./is-future-date.ts";

// Local calendar day, like the function under test: a UTC-based "today" would
// make this test (and the rule) flaky for users ahead of UTC.
function localIso(daysFromToday: number): string {
  const date = new Date(Date.now() + daysFromToday * 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

describe("isFutureDate", () => {
  it("should reject tomorrow and later", () => {
    expect(isFutureDate(localIso(1))).toBe(true);
    expect(isFutureDate("9999-01-01")).toBe(true);
  });

  it("should accept today and the past", () => {
    expect(isFutureDate(localIso(0))).toBe(false);
    expect(isFutureDate(localIso(-1))).toBe(false);
    expect(isFutureDate("1998-07-12")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { formatDate } from "./format-date.ts";

describe("formatDate", () => {
  it("should format a date as yyyy-mm-dd", () => {
    expect(formatDate(new Date("2026-07-01T10:30:00.000Z"))).toBe("2026-07-01");
  });

  it("should zero-pad month and day", () => {
    expect(formatDate(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01-05");
  });
});

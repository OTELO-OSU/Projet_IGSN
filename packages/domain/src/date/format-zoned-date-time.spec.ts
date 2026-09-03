import { describe, expect, it } from "vitest";

import { formatZonedDateTime } from "./format-zoned-date-time.ts";

describe("formatZonedDateTime", () => {
  it.each([
    ["2024-07-14T22:30:00Z", "2024-07-15T00:30"],
    ["2024-01-14T22:30:00Z", "2024-01-14T23:30"],
  ])("should render %s as the Paris wall clock %s", (instant, expected) => {
    expect(formatZonedDateTime(new Date(instant), "Europe/Paris")).toBe(
      expected,
    );
  });
});

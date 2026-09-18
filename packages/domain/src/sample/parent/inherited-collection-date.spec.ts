import { describe, expect, it } from "vitest";

import type { DateRange } from "../date-range.ts";

import { inheritedCollectionDate } from "./inherited-collection-date.ts";

const day = (start: string, end: string): DateRange => ({
  precision: "day",
  start,
  end,
});

const hour = (start: string, end: string, timeZone: string): DateRange => ({
  precision: "hour",
  start,
  end,
  timeZone,
});

describe("inheritedCollectionDate", () => {
  it("should inherit nothing from parents without a date", () => {
    expect(inheritedCollectionDate([null, null])).toBeNull();
  });

  it("should pass the date of the only dated parent through", () => {
    expect(
      inheritedCollectionDate([null, day("2024-03-05", "2024-03-10")]),
    ).toEqual(day("2024-03-05", "2024-03-10"));
  });

  it("should keep the calendar day of an hour-precision parent and drop its time zone", () => {
    expect(
      inheritedCollectionDate([
        hour("2024-03-05T08:30", "2024-03-06T09:30", "Europe/Paris"),
      ]),
    ).toEqual(day("2024-03-05", "2024-03-06"));
  });

  it("should span the earliest start to the latest end", () => {
    expect(
      inheritedCollectionDate([
        day("2024-03-05", "2024-03-10"),
        day("2024-03-01", "2024-03-07"),
      ]),
    ).toEqual(day("2024-03-01", "2024-03-10"));
  });
});

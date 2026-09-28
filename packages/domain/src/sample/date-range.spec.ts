import { describe, expect, it } from "vitest";

import { dateRangeSchema } from "./date-range.ts";

const schema = dateRangeSchema("sample_date");

const today = new Date().toISOString().slice(0, 10);

describe("dateRangeSchema", () => {
  it.each([
    [
      "a day range",
      { precision: "day", start: "2014-10-01", end: "2014-10-24" },
    ],
    [
      "an hour range in a time zone",
      {
        precision: "hour",
        start: "2014-10-01T08:15",
        end: "2014-10-01T17:45",
        timeZone: "Europe/Paris",
      },
    ],
    [
      "an hour bound dated today, since future is judged by the day",
      {
        precision: "hour",
        start: `${today}T00:00`,
        end: `${today}T23:59`,
        timeZone: "Europe/Paris",
      },
    ],
  ])("should accept %s", (_, dateRange) => {
    expect(schema.parse(dateRange)).toEqual(dateRange);
  });

  it.each([
    [
      "an hour bound without a time",
      {
        precision: "hour",
        start: "2014-10-01",
        end: "2014-10-01T17:45",
        timeZone: "Europe/Paris",
      },
    ],
    [
      "a day bound with a time",
      { precision: "day", start: "2014-10-01T08:15", end: "2014-10-24" },
    ],
    [
      "an hour range without a time zone",
      {
        precision: "hour",
        start: "2014-10-01T08:15",
        end: "2014-10-01T17:45",
      },
    ],
    [
      "an unknown time zone",
      {
        precision: "hour",
        start: "2014-10-01T08:15",
        end: "2014-10-01T17:45",
        timeZone: "Mars/Olympus_Mons",
      },
    ],
  ])("should reject %s", (_, dateRange) => {
    expect(schema.safeParse(dateRange).success).toBe(false);
  });

  it.each([
    { precision: "day", start: "2014-10-24", end: "2014-10-01" },
    {
      precision: "hour",
      start: "2014-10-01T17:45",
      end: "2014-10-01T08:15",
      timeZone: "Europe/Paris",
    },
  ])("should reject the range %j starting after it ends", (dateRange) => {
    const result = schema.safeParse(dateRange);

    expect(result.error?.issues).toMatchObject([
      { path: ["start"], params: { code: "sample_date_order" } },
    ]);
  });

  it.each([
    { precision: "day", start: "2999-01-01", end: "2999-01-02" },
    {
      precision: "hour",
      start: "2999-01-01T08:15",
      end: "2999-01-02T08:15",
      timeZone: "Europe/Paris",
    },
  ])("should reject the future range %j", (dateRange) => {
    const result = schema.safeParse(dateRange);

    expect(result.error?.issues).toMatchObject([
      { params: { code: "sample_date_future" } },
      { params: { code: "sample_date_future" } },
    ]);
  });
});

describe("dateRangeSchema on a malformed bound", () => {
  it.each([
    [
      "a day range typed as text",
      { precision: "day", start: "demain", end: "demain" },
    ],
    [
      "a text start before a valid end",
      { precision: "day", start: "demain", end: "2014-10-01" },
    ],
    [
      "an hour range with a future day but no valid time",
      {
        precision: "hour",
        start: "2999-01-01T8h",
        end: "2999-01-01T9h",
        timeZone: "Europe/Paris",
      },
    ],
  ])(
    "should report only the format of %s, neither order nor future",
    (_, dateRange) => {
      const codes = schema
        .safeParse(dateRange)
        .error?.issues.map(({ code }) => code);

      expect([...new Set(codes)]).toEqual(["invalid_format"]);
    },
  );
});

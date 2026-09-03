import { describe, expect, it } from "vitest";

import { collectionDateSchema } from "./collection-date.ts";

const today = new Date().toISOString().slice(0, 10);

describe("collectionDateSchema", () => {
  it("should accept a day range", () => {
    const collectionDate = {
      precision: "day",
      start: "2014-10-01",
      end: "2014-10-24",
    };

    expect(collectionDateSchema.parse(collectionDate)).toEqual(collectionDate);
  });

  it("should accept an hour range in a time zone", () => {
    const collectionDate = {
      precision: "hour",
      start: "2014-10-01T08:15",
      end: "2014-10-01T17:45",
      timeZone: "Europe/Paris",
    };

    expect(collectionDateSchema.parse(collectionDate)).toEqual(collectionDate);
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
      "an unknown time zone",
      {
        precision: "hour",
        start: "2014-10-01T08:15",
        end: "2014-10-01T17:45",
        timeZone: "Mars/Olympus_Mons",
      },
    ],
  ])("should reject %s", (_, collectionDate) => {
    expect(collectionDateSchema.safeParse(collectionDate).success).toBe(false);
  });

  it.each([
    { precision: "day", start: "2014-10-24", end: "2014-10-01" },
    {
      precision: "hour",
      start: "2014-10-01T17:45",
      end: "2014-10-01T08:15",
      timeZone: "Europe/Paris",
    },
  ])("should reject the range %j starting after it ends", (collectionDate) => {
    const result = collectionDateSchema.safeParse(collectionDate);

    expect(result.error?.issues).toMatchObject([
      { path: ["start"], params: { code: "collection_date_order" } },
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
  ])("should reject the future range %j", (collectionDate) => {
    const result = collectionDateSchema.safeParse(collectionDate);

    expect(result.error?.issues).toMatchObject([
      { params: { code: "collection_date_future" } },
      { params: { code: "collection_date_future" } },
    ]);
  });

  it("should accept an hour bound dated today, since future is judged by the day", () => {
    const result = collectionDateSchema.safeParse({
      precision: "hour",
      start: `${today}T00:00`,
      end: `${today}T23:59`,
      timeZone: "Europe/Paris",
    });

    expect(result.success).toBe(true);
  });
});

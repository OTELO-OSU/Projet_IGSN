import { dateFromToday } from "../../date/date-from-today.ts";
import { embargoPublicationDateSchema } from "./embargo-publication-date.ts";

describe("embargoPublicationDateSchema", () => {
  it.each([
    ["tomorrow", dateFromToday(0, 1)],
    ["two years from today", dateFromToday(2, 0)],
  ])("should accept %s", (_, date) => {
    expect(embargoPublicationDateSchema.parse(date)).toBe(date);
  });

  it.each([
    ["today", dateFromToday(0, 0), "publication_date_past"],
    [
      "the day after two years from today",
      dateFromToday(2, 1),
      "publication_date_too_far",
    ],
  ])("should refuse %s", (_, date, code) => {
    expect(embargoPublicationDateSchema.safeParse(date).error?.issues).toEqual([
      expect.objectContaining({ params: { code } }),
    ]);
  });
});

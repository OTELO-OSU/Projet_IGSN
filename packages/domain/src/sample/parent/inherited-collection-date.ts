import type { DateRange } from "../date-range.ts";

// A sub-sample inherits a day-precision span: hour bounds drop to their calendar day, time zones are not combined (ADR 0045).
const dayOf = (bound: string): string => bound.slice(0, "YYYY-MM-DD".length);

export function inheritedCollectionDate(
  collectionDates: readonly (DateRange | null | undefined)[],
): DateRange | null {
  const days = collectionDates
    .filter((date) => date != null)
    .flatMap(({ start, end }) => [dayOf(start), dayOf(end)])
    .toSorted();
  if (days.length === 0) return null;
  return { precision: "day", start: days[0]!, end: days.at(-1)! };
}

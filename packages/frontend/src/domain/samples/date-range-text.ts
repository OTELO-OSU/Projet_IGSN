import type { CollectionDate } from "@projet-igsn/domain/sample/description/collection-date";

export const dateRangeText = (
  date: CollectionDate | { start: string; end: string },
): string => {
  const start = date.start.replace("T", " ");
  const end = date.end.replace("T", " ");
  const range = start === end ? start : `${start} - ${end}`;
  return "precision" in date && date.precision === "hour"
    ? `${range} (${date.timeZone})`
    : range;
};

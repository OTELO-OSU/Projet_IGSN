import type { DateRange } from "@projet-igsn/domain/sample/date-range";

export const dateRangeText = (date: DateRange): string => {
  const start = date.start.replace("T", " ");
  const end = date.end.replace("T", " ");
  const range = start === end ? start : `${start} - ${end}`;
  return date.precision === "hour" ? `${range} (${date.timeZone})` : range;
};

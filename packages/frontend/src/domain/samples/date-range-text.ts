import type { CollectionDate } from "@projet-igsn/domain/sample/description/collection-date";

import { formatDate } from "@projet-igsn/domain/date/format-date";

export const dateRangeText = (
  date: CollectionDate | { start: string; end: string },
): string => {
  if ("precision" in date && date.precision === "hour") {
    const from = date.start.replace("T", " ");
    const range =
      date.start === date.end
        ? from
        : `${from} - ${date.end.replace("T", " ")}`;
    return `${range} (${date.timeZone})`;
  }
  const from = formatDate(new Date(date.start));
  return date.start === date.end
    ? from
    : `${from} - ${formatDate(new Date(date.end))}`;
};

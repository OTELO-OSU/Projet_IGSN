import { formatDate } from "../../date/format-date.ts";

// A collection date cannot be in the future.
const MAX_UTC_OFFSET_MS = 14 * 3_600_000;

export function isFutureDate(isoDate: string): boolean {
  const lastTodayOnEarth = formatDate(new Date(Date.now() + MAX_UTC_OFFSET_MS));
  return isoDate.slice(0, 10) > lastTodayOnEarth;
}

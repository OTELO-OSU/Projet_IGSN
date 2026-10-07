import { formatDate } from "./format-date.ts";

export function dateFromToday(years: number, days: number): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + years);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

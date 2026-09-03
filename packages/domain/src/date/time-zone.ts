import { z } from "zod";

const formatters = new Map<string, Intl.DateTimeFormat>();

export function zonedDateTimeFormat(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    zonedDateTimeFormat(timeZone);
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .refine(isValidTimeZone, { error: "unknown IANA time zone" });

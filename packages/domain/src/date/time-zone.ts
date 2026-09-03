import { z } from "zod";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .refine(isValidTimeZone, { error: "unknown IANA time zone" });

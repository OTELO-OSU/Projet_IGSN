import { zonedDateTimeFormat } from "./time-zone.ts";

export function formatZonedDateTime(date: Date, timeZone: string): string {
  return zonedDateTimeFormat(timeZone).format(date).replace(" ", "T");
}

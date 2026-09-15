import type { DatePrecision, DateRange } from "../date-range.ts";

export function fromCoreDateRange(core: {
  start: string;
  end: string;
  precision: DatePrecision | undefined;
  timeZone: string | undefined;
}): DateRange {
  const { start, end, timeZone } = core;
  if (core.precision !== "hour") return { precision: "day", start, end };
  if (timeZone == null) {
    throw new Error("an hour precision core date carries its time zone");
  }
  return { precision: "hour", start, end, timeZone };
}

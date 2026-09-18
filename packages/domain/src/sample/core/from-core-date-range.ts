import type { DatePrecision, DateRange } from "../date-range.ts";
import type { CoreProcessStep } from "./core-production-schema.ts";

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

export function fromCoreStepDate(
  step: CoreProcessStep | undefined,
): DateRange | null {
  if (step?.timestampStart == null || step.timestampEnd == null) return null;
  return fromCoreDateRange({
    start: step.timestampStart,
    end: step.timestampEnd,
    precision: step.timestampPrecision,
    timeZone: step.timestampTimeZone,
  });
}

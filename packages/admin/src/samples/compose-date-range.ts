import type {
  DatePrecision,
  DateRange,
} from "@projet-igsn/domain/sample/date-range";

import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

export type DateRangeDraft = {
  start: string | undefined;
  end: string | undefined;
  precision: DatePrecision;
  timeZone: string | undefined;
};

export function composeDateRange(draft: DateRangeDraft) {
  if (draft.start === undefined && draft.end === undefined) return undefined;
  return {
    precision: draft.precision,
    start: draft.start,
    end: draft.end,
    timeZone: draft.precision === "hour" ? draft.timeZone : undefined,
  };
}

export function toDateRangeDraft(
  range: DateRange | null | undefined,
  options: DraftOptions,
): DateRangeDraft {
  return {
    start: range?.start,
    end: range?.end,
    precision: range?.precision ?? draftDefault(options, "day"),
    timeZone: range?.precision === "hour" ? range.timeZone : undefined,
  };
}

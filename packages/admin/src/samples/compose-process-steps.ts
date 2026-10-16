import type { DatePrecision } from "@projet-igsn/domain/sample/date-range";
import type { ProcessStepKind } from "@projet-igsn/domain/sample/process-step/kind";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  composeDateRange,
  toDateRangeDraft,
} from "#/samples/compose-date-range.ts";
import { type DraftOptions } from "#/samples/draft-defaults.ts";

export type ProcessStepDraft = {
  key: string;
  kind: ProcessStepKind;
  dateStart: string | undefined;
  dateEnd: string | undefined;
  datePrecision: DatePrecision;
  dateTimeZone: string | undefined;
  description: string;
};

export const EMPTY_PROCESS_STEP_DRAFT: Omit<ProcessStepDraft, "key" | "kind"> =
  {
    dateStart: undefined,
    dateEnd: undefined,
    datePrecision: "day",
    dateTimeZone: undefined,
    description: "",
  };

export const toProcessStepDrafts = (
  steps: CreateSample["processSteps"],
  options: DraftOptions,
): ProcessStepDraft[] =>
  (steps ?? []).map((step) => {
    const date = toDateRangeDraft(step.date, options);
    return {
      key: crypto.randomUUID(),
      kind: step.kind,
      dateStart: date.start,
      dateEnd: date.end,
      datePrecision: date.precision,
      dateTimeZone: date.timeZone,
      description: step.description ?? "",
    };
  });

export const composeProcessSteps = (steps: ProcessStepDraft[]) =>
  steps.map((step) => ({
    kind: step.kind,
    date: composeDateRange({
      start: step.dateStart,
      end: step.dateEnd,
      precision: step.datePrecision,
      timeZone: step.dateTimeZone,
    }),
    description: step.description.trim() || undefined,
  }));

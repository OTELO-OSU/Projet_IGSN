import { z } from "zod";

export const EXPERIMENT_DURATION_UNITS = [
  "millisecond",
  "second",
  "minute",
  "hour",
  "day",
  "month",
] as const;

export const experimentDurationUnitSchema = z.enum(EXPERIMENT_DURATION_UNITS);

export type ExperimentDurationUnit = z.infer<
  typeof experimentDurationUnitSchema
>;

export const experimentDurationUnitLabel: Record<
  ExperimentDurationUnit,
  string
> = {
  millisecond: "ms",
  second: "s",
  minute: "min",
  hour: "h",
  day: "d",
  month: "mo",
};

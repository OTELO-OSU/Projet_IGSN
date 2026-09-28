import { z } from "zod";

import { timeZoneSchema } from "../date/time-zone.ts";
import { isFutureDate } from "./description/is-future-date.ts";

export const localDateTimeSchema = z.iso
  .datetime({ local: true, precision: -1 })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

const BOUND_SCHEMA = { day: z.iso.date(), hour: localDateTimeSchema };

const dateRangeIssues =
  (codePrefix: string) =>
  (
    period: {
      precision: keyof typeof BOUND_SCHEMA;
      start: string;
      end: string;
    },
    ctx: z.RefinementCtx,
  ): void => {
    const wellFormed = (bound: "start" | "end") =>
      BOUND_SCHEMA[period.precision].safeParse(period[bound]).success;
    if (wellFormed("start") && wellFormed("end") && period.start > period.end) {
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "date range start must not be after end",
        params: { code: `${codePrefix}_order` },
      });
    }
    for (const bound of ["start", "end"] as const) {
      if (wellFormed(bound) && isFutureDate(period[bound])) {
        ctx.addIssue({
          code: "custom",
          path: [bound],
          message: "date must not be in the future",
          params: { code: `${codePrefix}_future` },
        });
      }
    }
  };

export const dateRangeSchema = (codePrefix: string) =>
  z
    .discriminatedUnion("precision", [
      z.object({
        precision: z.literal("day"),
        start: BOUND_SCHEMA.day,
        end: BOUND_SCHEMA.day,
      }),
      z.object({
        precision: z.literal("hour"),
        start: BOUND_SCHEMA.hour,
        end: BOUND_SCHEMA.hour,
        timeZone: timeZoneSchema,
      }),
    ])
    .superRefine(dateRangeIssues(codePrefix));

export type DateRange = z.infer<ReturnType<typeof dateRangeSchema>>;

export type DatePrecision = DateRange["precision"];

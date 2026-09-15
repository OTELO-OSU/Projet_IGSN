import { z } from "zod";

import { timeZoneSchema } from "../date/time-zone.ts";
import { isFutureDate } from "./description/is-future-date.ts";

export const dateRangeIssues =
  (codePrefix: string) =>
  (period: { start: string; end: string }, ctx: z.RefinementCtx): void => {
    if (period.start > period.end) {
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "date range start must not be after end",
        params: { code: `${codePrefix}_order` },
      });
    }
    for (const bound of ["start", "end"] as const) {
      if (isFutureDate(period[bound])) {
        ctx.addIssue({
          code: "custom",
          path: [bound],
          message: "date must not be in the future",
          params: { code: `${codePrefix}_future` },
        });
      }
    }
  };

export const localDateTimeSchema = z.iso
  .datetime({ local: true, precision: -1 })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export const dateRangeSchema = (codePrefix: string) =>
  z
    .discriminatedUnion("precision", [
      z.object({
        precision: z.literal("day"),
        start: z.iso.date(),
        end: z.iso.date(),
      }),
      z.object({
        precision: z.literal("hour"),
        start: localDateTimeSchema,
        end: localDateTimeSchema,
        timeZone: timeZoneSchema,
      }),
    ])
    .superRefine(dateRangeIssues(codePrefix));

export type DateRange = z.infer<ReturnType<typeof dateRangeSchema>>;

export type DatePrecision = DateRange["precision"];

import { z } from "zod";

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

export const dateRangeSchema = (codePrefix: string) =>
  z
    .object({
      start: z.iso.date(),
      end: z.iso.date(),
    })
    .superRefine(dateRangeIssues(codePrefix));

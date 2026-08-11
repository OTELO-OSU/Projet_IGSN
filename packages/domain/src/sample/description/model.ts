import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { measurementSchema } from "../measurement.ts";
import { isFutureDate } from "./is-future-date.ts";
import { massUnitSchema } from "./mass-unit.ts";
import { sizeUnitSchema } from "./size-unit.ts";
import { volumeUnitSchema } from "./volume-unit.ts";

// A single collection date is the degenerate range start === end (ADR 0015).
const collectionDateSchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
});

export const descriptionSchema = z
  .object({
    collectionDate: collectionDateSchema.nullish(),
    oriented: z.boolean().nullish(),
    orientationExplanation: freeTextSchema.nullish(),
    openDescription: freeTextSchema.nullish(),
    // Each size dimension carries its own unit (a long axis in cm can pair
    // with a thickness in mm).
    length: measurementSchema(sizeUnitSchema).nullish(),
    width: measurementSchema(sizeUnitSchema).nullish(),
    thickness: measurementSchema(sizeUnitSchema).nullish(),
    mass: measurementSchema(massUnitSchema).nullish(),
    volume: measurementSchema(volumeUnitSchema).nullish(),
  })
  .superRefine((description, ctx) => {
    // ISO dates order correctly as strings.
    const period = description.collectionDate;
    // params.code lets consumers (the admin form) translate the issue without
    // matching on the message text.
    if (period != null && period.start > period.end) {
      ctx.addIssue({
        code: "custom",
        path: ["collectionDate", "start"],
        message: "collection date start must not be after end",
        params: { code: "collection_date_order" },
      });
    }
    for (const bound of ["start", "end"] as const) {
      if (period != null && isFutureDate(period[bound])) {
        ctx.addIssue({
          code: "custom",
          path: ["collectionDate", bound],
          message: "collection date must not be in the future",
          params: { code: "collection_date_future" },
        });
      }
    }
    if (
      description.orientationExplanation != null &&
      description.oriented !== true
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["orientationExplanation"],
        message: "orientationExplanation requires oriented to be true",
      });
    }
  });

export type Description = z.infer<typeof descriptionSchema>;

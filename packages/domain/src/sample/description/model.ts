import { z } from "zod";

import { isFutureDate } from "./is-future-date.ts";
import { massUnitSchema } from "./mass-unit.ts";
import { sizeUnitSchema } from "./size-unit.ts";
import { volumeUnitSchema } from "./volume-unit.ts";

// A sample's physical description (ADR 0015). Every part is independent and
// optional; `sample.description` as a whole is nullable.
//
// nameSchema is not imported from sample.ts: sample.ts imports this module, so
// the dependency must not run the other way (same seam as location/model.ts).
const freeText = z.string().trim().min(1);

// A measurement pairs a value with its unit, both required once the object is
// present: "the unit is mandatory exactly when its value is set" holds
// structurally, no refinement to forget (ADR 0015).
const measurementSchema = <U extends z.ZodType>(unit: U) =>
  z.object({ value: z.number().positive(), unit });

// Collection period, date-only ISO strings (no time, no timezone). A single
// collection date is the degenerate range start === end (ADR 0015).
const collectionDateSchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
});

export const descriptionSchema = z
  .object({
    collectionDate: collectionDateSchema.nullish(),
    // Null until the question is answered; the form offers yes/no.
    oriented: z.boolean().nullish(),
    orientationExplanation: freeText.nullish(),
    // Free text: morphology, texture, alteration, interest.
    openDescription: freeText.nullish(),
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
    if (period != null && period.start > period.end) {
      ctx.addIssue({
        code: "custom",
        path: ["collectionDate", "start"],
        message: "collection date start must not be after end",
      });
    }
    // A sample cannot have been collected in the future.
    for (const bound of ["start", "end"] as const) {
      if (period != null && isFutureDate(period[bound])) {
        ctx.addIssue({
          code: "custom",
          path: ["collectionDate", bound],
          message: "collection date must not be in the future",
        });
      }
    }
    // The explanation documents why/how the sample is oriented, so it is
    // meaningless unless the orientation question was answered yes.
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

import { z } from "zod";

import { geologicalAgeSchema } from "./geological-age.ts";
import { numericUnitSchema } from "./numeric-unit.ts";
import { yearsUnitSchema } from "./years-unit.ts";

// Stable codes for the age validation errors, emitted as the Zod issue message
// so the app can translate them (i18n rule: codes, not labels).
export const ageErrorSchema = z.enum([
  "numeric_range_order",
  "numeric_unit_without_value",
  "numeric_years_unit_requires_annum",
]);
export type AgeError = z.infer<typeof ageErrorSchema>;

// A sample's age. Every field is optional (an empty age is all-null). Two
// independent, and/or-combined blocks:
//  - numeric: a min/max range sharing one unit and (only meaningful for annum)
//    one years unit. A non-range value stores the same number in both bounds
//    (min == max), so search is uniform (min <= X and max >= X).
//  - stratigraphic: a geological min/max range plus a free-text lithostratigraphic
//    unit; a non-range value stores the same code in both bounds.
// A half-entered range (one bound only) stays valid here: it is an unfinished
// draft, gated at publish via samplePublishBlockers, not rejected while editing.
export const ageSchema = z
  .strictObject({
    numericAgeMin: z.number().nullable().default(null),
    numericAgeMax: z.number().nullable().default(null),
    numericAgeUnit: numericUnitSchema.nullable().default(null),
    numericAgeYearsUnit: yearsUnitSchema.nullable().default(null),
    geologicalAgeMin: geologicalAgeSchema.nullable().default(null),
    geologicalAgeMax: geologicalAgeSchema.nullable().default(null),
    geologicalUnit: z.string().trim().min(1).nullable().default(null),
  })
  .superRefine((value, ctx) => {
    // One shared unit, so bounds are ordered directly (no cross-unit conversion).
    if (
      value.numericAgeMin != null &&
      value.numericAgeMax != null &&
      value.numericAgeMin > value.numericAgeMax
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["numericAgeMax"],
        message: ageErrorSchema.enum.numeric_range_order,
      });
    }

    // A shared unit/years unit needs a value to qualify.
    const hasNumericValue =
      value.numericAgeMin != null || value.numericAgeMax != null;
    if (
      (value.numericAgeUnit != null || value.numericAgeYearsUnit != null) &&
      !hasNumericValue
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["numericAgeUnit"],
        message: "numeric_unit_without_value",
      });
    }

    // A years unit (CE/BCE/BP/cal BP) only makes sense counted from annum.
    if (value.numericAgeYearsUnit != null && value.numericAgeUnit !== "a") {
      ctx.addIssue({
        code: "custom",
        path: ["numericAgeYearsUnit"],
        message: "numeric_years_unit_requires_annum",
      });
    }
  });

export type Age = z.infer<typeof ageSchema>;

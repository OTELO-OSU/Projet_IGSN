import { z } from "zod";

import { geologicalAgeSchema } from "./geological-age.ts";
import { numericUnitSchema } from "./numeric-unit.ts";
import { yearsUnitSchema } from "./years-unit.ts";

export const ageErrorSchema = z.enum([
  "numeric_range_order",
  "numeric_unit_without_value",
  "numeric_years_unit_requires_annum",
]);
export type AgeError = z.infer<typeof ageErrorSchema>;

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

    if (value.numericAgeYearsUnit != null && value.numericAgeUnit !== "a") {
      ctx.addIssue({
        code: "custom",
        path: ["numericAgeYearsUnit"],
        message: "numeric_years_unit_requires_annum",
      });
    }
  });

export type Age = z.infer<typeof ageSchema>;

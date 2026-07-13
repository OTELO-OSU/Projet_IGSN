import { z } from "zod";

import { geologicalAgeSchema } from "./geological-age.ts";
import {
  NUMERIC_UNIT_MAGNITUDE,
  type NumericUnit,
  numericUnitSchema,
} from "./numeric-unit.ts";
import { yearsUnitSchema } from "./years-unit.ts";

// Stable codes for the age validation errors, emitted as the Zod issue message
// so the app can translate them (i18n rule: codes, not labels).
export const ageErrorSchema = z.enum([
  "numeric_single_and_range",
  "numeric_range_order",
  "numeric_unit_without_value",
  "numeric_years_unit_requires_annum",
  "geological_single_and_range",
]);
export type AgeError = z.infer<typeof ageErrorSchema>;

// A single value and a min/max range are mutually exclusive. A half-entered
// range (one bound only) stays valid here: it is an unfinished draft, gated at
// publish via samplePublishBlockers, not rejected while editing. Shared by the
// numeric and geological blocks below.
function checkSingleVsRange(
  ctx: z.RefinementCtx,
  bounds: {
    single: unknown;
    min: unknown;
    max: unknown;
    singlePath: string;
    exclusiveError: AgeError;
  },
): void {
  const hasRange = bounds.min != null || bounds.max != null;
  if (bounds.single != null && hasRange) {
    ctx.addIssue({
      code: "custom",
      path: [bounds.singlePath],
      message: bounds.exclusiveError,
    });
  }
}

// A numeric age expressed in annum, so bounds in different units can be
// ordered (e.g. a "500 ka" min against a "2 ga" max). Unit defaults to annum.
function inAnnum(value: number, unit: NumericUnit | null): number {
  return value * NUMERIC_UNIT_MAGNITUDE[unit ?? "a"];
}

// A unit/years unit needs its own value, and a years unit (CE/BCE/BP/cal BP)
// only makes sense counted from annum, so it needs unit "a".
function checkNumericBound(
  ctx: z.RefinementCtx,
  bound: {
    value: number | null;
    unit: string | null;
    years: string | null;
    unitPath: string;
    yearsPath: string;
  },
): void {
  if ((bound.unit != null || bound.years != null) && bound.value == null) {
    ctx.addIssue({
      code: "custom",
      path: [bound.unitPath],
      message: "numeric_unit_without_value",
    });
  }
  if (bound.years != null && bound.unit !== "a") {
    ctx.addIssue({
      code: "custom",
      path: [bound.yearsPath],
      message: "numeric_years_unit_requires_annum",
    });
  }
}

// A sample's geological age. Every field is optional (0:1, an empty age is no
// row at all). Two independent, and/or-combined blocks:
//  - numeric: a single value OR a min+max range; each value carries its own
//    unit and (only meaningful for annum) years unit;
//  - stratigraphic: a single geological age OR a min+max range.
// Plus a free-text lithostratigraphic unit. The single-vs-range exclusivity is
// enforced below, mirroring the texture guard in ../sample.ts.
export const ageSchema = z
  .strictObject({
    numericAge: z.number().nullable().default(null),
    numericAgeUnit: numericUnitSchema.nullable().default(null),
    numericAgeYearsUnit: yearsUnitSchema.nullable().default(null),
    numericAgeMin: z.number().nullable().default(null),
    numericAgeMinUnit: numericUnitSchema.nullable().default(null),
    numericAgeMinYearsUnit: yearsUnitSchema.nullable().default(null),
    numericAgeMax: z.number().nullable().default(null),
    numericAgeMaxUnit: numericUnitSchema.nullable().default(null),
    numericAgeMaxYearsUnit: yearsUnitSchema.nullable().default(null),
    geologicalAge: geologicalAgeSchema.nullable().default(null),
    geologicalAgeMin: geologicalAgeSchema.nullable().default(null),
    geologicalAgeMax: geologicalAgeSchema.nullable().default(null),
    geologicalUnit: z.string().trim().min(1).nullable().default(null),
  })
  .superRefine((value, ctx) => {
    checkSingleVsRange(ctx, {
      single: value.numericAge,
      min: value.numericAgeMin,
      max: value.numericAgeMax,
      singlePath: "numericAge",
      exclusiveError: "numeric_single_and_range",
    });

    // Order the bounds only when both are comparable: either both carry a unit
    // or both omit it (defaulting to annum). A half-entered range with one unit
    // still missing (units are a publish blocker, not a draft error) cannot be
    // ordered yet, so skip rather than reject it as inverted.
    const bothUnitsKnown =
      (value.numericAgeMinUnit == null) === (value.numericAgeMaxUnit == null);
    if (
      value.numericAgeMin != null &&
      value.numericAgeMax != null &&
      bothUnitsKnown &&
      inAnnum(value.numericAgeMin, value.numericAgeMinUnit) >
        inAnnum(value.numericAgeMax, value.numericAgeMaxUnit)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["numericAgeMax"],
        message: ageErrorSchema.enum.numeric_range_order,
      });
    }

    for (const prefix of [
      "numericAge",
      "numericAgeMin",
      "numericAgeMax",
    ] as const) {
      checkNumericBound(ctx, {
        value: value[prefix],
        unit: value[`${prefix}Unit`],
        years: value[`${prefix}YearsUnit`],
        unitPath: `${prefix}Unit`,
        yearsPath: `${prefix}YearsUnit`,
      });
    }

    checkSingleVsRange(ctx, {
      single: value.geologicalAge,
      min: value.geologicalAgeMin,
      max: value.geologicalAgeMax,
      singlePath: "geologicalAge",
      exclusiveError: "geological_single_and_range",
    });
  });

export type Age = z.infer<typeof ageSchema>;

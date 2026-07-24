import { type NumericUnit } from "./numeric-unit.ts";

// Convert a numeric age magnitude to annum (years), the canonical unit for
// range comparison across mixed-unit samples. Used to convert a query's bounds;
// the stored sample value is converted by the generated numeric_age_*_a columns
// (add-numeric-age-annum-columns migration), which duplicate these multipliers
// in SQL. Keep the two in sync.
export const NUMERIC_UNIT_TO_ANNUM: Record<NumericUnit, number> = {
  a: 1,
  ka: 1e3,
  ma: 1e6,
  ga: 1e9,
};

export function numericAgeToAnnum(value: number, unit: NumericUnit): number {
  return value * NUMERIC_UNIT_TO_ANNUM[unit];
}

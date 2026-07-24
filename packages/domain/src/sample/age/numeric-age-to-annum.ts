import { type NumericUnit } from "./numeric-unit.ts";

// Convert a numeric age magnitude to annum (years before present), the canonical
// unit for range comparison across mixed-unit samples. Used to convert a query's
// bounds, which stay on the before-present axis ('a' means BP), so no calendar
// offset is needed here. The stored sample value is converted by the generated
// numeric_age_*_a columns (add-numeric-age-annum-columns migration), which
// duplicate these multipliers AND additionally apply the CE/BCE/BP offset the
// query never needs. Keep the multipliers in sync.
export const NUMERIC_UNIT_TO_ANNUM: Record<NumericUnit, number> = {
  a: 1,
  ka: 1e3,
  ma: 1e6,
  ga: 1e9,
};

export function numericAgeToAnnum(value: number, unit: NumericUnit): number {
  return value * NUMERIC_UNIT_TO_ANNUM[unit];
}

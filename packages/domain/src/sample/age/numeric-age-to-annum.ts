import { type NumericUnit } from "./numeric-unit.ts";

export const NUMERIC_UNIT_TO_ANNUM: Record<NumericUnit, number> = {
  a: 1,
  ka: 1e3,
  ma: 1e6,
  ga: 1e9,
};

export function numericAgeToAnnum(value: number, unit: NumericUnit): number {
  return value * NUMERIC_UNIT_TO_ANNUM[unit];
}

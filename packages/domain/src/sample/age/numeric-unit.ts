import { z } from "zod";

// Order-of-magnitude unit for a numeric age: annum, kilo-, mega-, giga-annum.
export const numericUnitSchema = z.enum(["a", "ka", "ma", "ga"]);

export type NumericUnit = z.infer<typeof numericUnitSchema>;

// Each unit as a multiple of annum, so ages in different units can be compared
// (e.g. to order a "500 ka" min against a "2 ga" max).
export const NUMERIC_UNIT_MAGNITUDE: Record<NumericUnit, number> = {
  a: 1,
  ka: 1e3,
  ma: 1e6,
  ga: 1e9,
};

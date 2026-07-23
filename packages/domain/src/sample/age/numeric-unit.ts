import { z } from "zod";

// Order-of-magnitude unit for a numeric age: annum, kilo-, mega-, giga-annum.
export const NUMERIC_UNITS = ["a", "ka", "ma", "ga"] as const;
export const numericUnitSchema = z.enum(NUMERIC_UNITS);

export type NumericUnit = z.infer<typeof numericUnitSchema>;

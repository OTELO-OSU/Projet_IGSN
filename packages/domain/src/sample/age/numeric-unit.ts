import { z } from "zod";

// Order-of-magnitude unit for a numeric age: annum, kilo-, mega-, giga-annum.
export const numericUnitSchema = z.enum(["a", "ka", "ma", "ga"]);

export type NumericUnit = z.infer<typeof numericUnitSchema>;

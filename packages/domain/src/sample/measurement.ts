import { z } from "zod";

// A measurement pairs a value with its unit, both required once the object is
// present: "the unit is mandatory exactly when its value is set" holds
// structurally, no refinement to forget (ADR 0016). The value is strictly
// positive by default; pass a custom number schema when the domain allows
// more (e.g. a sub-zero storage temperature).
export const measurementSchema = <U extends z.ZodType>(
  unit: U,
  value: z.ZodNumber = z.number().positive(),
) => z.object({ value, unit });

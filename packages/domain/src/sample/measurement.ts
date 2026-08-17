import { z } from "zod";

export const measurementSchema = <U extends z.ZodType>(
  unit: U,
  value: z.ZodNumber = z.number().positive(),
) => z.object({ value, unit });

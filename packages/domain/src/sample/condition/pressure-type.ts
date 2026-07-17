import { z } from "zod";

export const PRESSURE_TYPES = [
  "atmospheric",
  "vacuum",
  "controlled_air",
  "controlled_gas",
] as const;

export const pressureTypeSchema = z.enum(PRESSURE_TYPES);

export type PressureType = z.infer<typeof pressureTypeSchema>;

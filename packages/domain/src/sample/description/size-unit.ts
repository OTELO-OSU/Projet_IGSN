import { z } from "zod";

export const SIZE_UNITS = ["mm", "cm", "dm", "m"] as const;

export const sizeUnitSchema = z.enum(SIZE_UNITS);

export type SizeUnit = z.infer<typeof sizeUnitSchema>;

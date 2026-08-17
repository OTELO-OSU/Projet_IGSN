import { z } from "zod";

export const MASS_UNITS = ["mg", "g", "kg"] as const;

export const massUnitSchema = z.enum(MASS_UNITS);

export type MassUnit = z.infer<typeof massUnitSchema>;

import { z } from "zod";

// Unit for a mass value. Symbols, language-neutral, so the code is its own
// label (no i18n map).
export const MASS_UNITS = ["mg", "g", "kg"] as const;

export const massUnitSchema = z.enum(MASS_UNITS);

export type MassUnit = z.infer<typeof massUnitSchema>;

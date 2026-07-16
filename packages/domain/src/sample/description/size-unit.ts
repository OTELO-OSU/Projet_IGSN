import { z } from "zod";

// Unit for a size dimension (length, width, thickness). Symbols,
// language-neutral, so the code is its own label (no i18n map).
export const SIZE_UNITS = ["mm", "cm", "dm", "m"] as const;

export const sizeUnitSchema = z.enum(SIZE_UNITS);

export type SizeUnit = z.infer<typeof sizeUnitSchema>;

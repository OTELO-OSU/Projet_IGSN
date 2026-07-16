import { z } from "zod";

// Unit for an elevation/bathymetry value. Symbols, language-neutral, so the code
// is its own label (no i18n map).
export const ELEVATION_UNITS = ["m", "km"] as const;

export const elevationUnitSchema = z.enum(ELEVATION_UNITS);

export type ElevationUnit = z.infer<typeof elevationUnitSchema>;

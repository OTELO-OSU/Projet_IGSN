import { z } from "zod";

export const ELEVATION_UNITS = ["m", "km"] as const;

export const elevationUnitSchema = z.enum(ELEVATION_UNITS);

export type ElevationUnit = z.infer<typeof elevationUnitSchema>;

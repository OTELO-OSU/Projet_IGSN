import { z } from "zod";

// Whether a sample's location is a single point or a bounding area. Governs only
// the coordinate block of a location (see model.ts); locality, region and
// navigation type stand alone.
export const LOCATION_TYPES = ["point", "area"] as const;

export const locationTypeSchema = z.enum(LOCATION_TYPES);

export type LocationType = z.infer<typeof locationTypeSchema>;

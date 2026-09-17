import { z } from "zod";

export const LOCATION_TYPES = ["point", "area", "line"] as const;

const locationTypeSchema = z.enum(LOCATION_TYPES);

export type LocationType = z.infer<typeof locationTypeSchema>;

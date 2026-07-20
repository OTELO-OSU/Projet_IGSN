import { z } from "zod";

// Whether the physical sample still exists. Defaults to "exists" where used;
// stored as a lower_snake_case code, never a label (i18n rule).
export const AVAILABILITIES = ["exists", "no_longer_exists"] as const;

export const availabilitySchema = z.enum(AVAILABILITIES);

export type Availability = z.infer<typeof availabilitySchema>;

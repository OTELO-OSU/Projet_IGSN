import { z } from "zod";

export const AVAILABILITIES = ["exists", "no_longer_exists"] as const;

export const availabilitySchema = z.enum(AVAILABILITIES);

export type Availability = z.infer<typeof availabilitySchema>;

import { z } from "zod";

export const AVAILABILITY_STATUSES = [
  "available",
  "restricted",
  "temporarily_unavailable",
  "not_available",
  "unknown",
] as const;

export const availabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);

export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

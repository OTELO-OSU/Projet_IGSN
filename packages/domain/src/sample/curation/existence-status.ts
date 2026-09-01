import { z } from "zod";

export const EXISTENCE_STATUSES = [
  "exists",
  "partially_consumed",
  "consumed",
  "destroyed",
  "lost",
  "unknown",
] as const;

export const existenceStatusSchema = z.enum(EXISTENCE_STATUSES);

export type ExistenceStatus = z.infer<typeof existenceStatusSchema>;

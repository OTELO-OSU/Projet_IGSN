import { z } from "zod";

export const STORAGE_CONDITIONS = [
  "no_specific_condition",
  "temperature_controlled",
  "pressure_controlled",
  "moisture_controlled",
  "light_controlled",
] as const;

export const storageConditionSchema = z.enum(STORAGE_CONDITIONS);

export type StorageCondition = z.infer<typeof storageConditionSchema>;

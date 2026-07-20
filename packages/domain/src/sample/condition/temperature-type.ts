import { z } from "zod";

export const TEMPERATURE_TYPES = [
  "ambient",
  "controlled",
  "refrigerated",
  "frozen",
  "ultra_frozen",
  "liquid_nitrogen",
] as const;

export const temperatureTypeSchema = z.enum(TEMPERATURE_TYPES);

export type TemperatureType = z.infer<typeof temperatureTypeSchema>;

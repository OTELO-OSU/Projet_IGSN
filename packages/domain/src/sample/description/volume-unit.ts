import { z } from "zod";

export const VOLUME_UNITS = ["mm3", "cm3", "dm3", "m3", "ml", "l"] as const;

export const volumeUnitSchema = z.enum(VOLUME_UNITS);

export type VolumeUnit = z.infer<typeof volumeUnitSchema>;

export const volumeUnitLabel: Record<VolumeUnit, string> = {
  mm3: "mm³",
  cm3: "cm³",
  dm3: "dm³",
  m3: "m³",
  ml: "mL",
  l: "L",
};

import { z } from "zod";

// Unit for a volume value, as lower-case codes (the display symbol needs
// superscripts/case the code cannot carry, see volumeUnitLabel).
export const VOLUME_UNITS = ["mm3", "cm3", "dm3", "m3", "ml", "l"] as const;

export const volumeUnitSchema = z.enum(VOLUME_UNITS);

export type VolumeUnit = z.infer<typeof volumeUnitSchema>;

// Language-neutral SI symbols, so a plain display map, not an i18n catalog.
// Exhaustive by type: adding a unit fails to compile until labeled.
export const volumeUnitLabel: Record<VolumeUnit, string> = {
  mm3: "mm³",
  cm3: "cm³",
  dm3: "dm³",
  m3: "m³",
  ml: "mL",
  l: "L",
};

import { z } from "zod";

// Unit for a pressure value, as lower-case codes (mmHg needs case the code
// cannot carry, see pressureUnitLabel).
export const PRESSURE_UNITS = ["mbar", "mmhg", "bar", "kbar", "atm"] as const;

export const pressureUnitSchema = z.enum(PRESSURE_UNITS);

export type PressureUnit = z.infer<typeof pressureUnitSchema>;

// Language-neutral symbols, so a plain display map, not an i18n catalog.
// Exhaustive by type: adding a unit fails to compile until labeled.
export const pressureUnitLabel: Record<PressureUnit, string> = {
  mbar: "mbar",
  mmhg: "mmHg",
  bar: "bar",
  kbar: "kbar",
  atm: "atm",
};

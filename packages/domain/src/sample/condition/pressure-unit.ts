import { z } from "zod";

export const PRESSURE_UNITS = ["mbar", "mmhg", "bar", "kbar", "atm"] as const;

export const pressureUnitSchema = z.enum(PRESSURE_UNITS);

export type PressureUnit = z.infer<typeof pressureUnitSchema>;

export const pressureUnitLabel: Record<PressureUnit, string> = {
  mbar: "mbar",
  mmhg: "mmHg",
  bar: "bar",
  kbar: "kbar",
  atm: "atm",
};

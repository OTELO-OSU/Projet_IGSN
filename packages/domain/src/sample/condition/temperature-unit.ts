import { z } from "zod";

// Unit for a temperature value, as lower-case codes (the display symbol needs
// the degree sign the code cannot carry, see temperatureUnitLabel).
export const TEMPERATURE_UNITS = ["celsius", "fahrenheit", "kelvin"] as const;

export const temperatureUnitSchema = z.enum(TEMPERATURE_UNITS);

export type TemperatureUnit = z.infer<typeof temperatureUnitSchema>;

// Language-neutral symbols, so a plain display map, not an i18n catalog.
// Exhaustive by type: adding a unit fails to compile until labeled.
export const temperatureUnitLabel: Record<TemperatureUnit, string> = {
  celsius: "°C",
  fahrenheit: "°F",
  kelvin: "K",
};

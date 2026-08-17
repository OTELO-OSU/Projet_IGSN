import { z } from "zod";

export const TEMPERATURE_UNITS = ["celsius", "fahrenheit", "kelvin"] as const;

export const temperatureUnitSchema = z.enum(TEMPERATURE_UNITS);

export type TemperatureUnit = z.infer<typeof temperatureUnitSchema>;

export const temperatureUnitLabel: Record<TemperatureUnit, string> = {
  celsius: "°C",
  fahrenheit: "°F",
  kelvin: "K",
};

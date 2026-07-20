import { z } from "zod";

export const HUMIDITY_TYPES = [
  "dehydrated",
  "dry",
  "moderate",
  "humid",
  "controlled",
] as const;

export const humidityTypeSchema = z.enum(HUMIDITY_TYPES);

export type HumidityType = z.infer<typeof humidityTypeSchema>;

// The measured percentage must fall in the declared range ("<10%" cannot
// carry 11). Adjacent ranges share their bound (30 fits both "10-30%" and
// "30-50%"); "controlled" fixes no range, so any percentage fits.
export function isHumidityPercentageInRange(
  type: HumidityType,
  percentage: number,
): boolean {
  switch (type) {
    case "dehydrated":
      return percentage < 10;
    case "dry":
      return percentage >= 10 && percentage <= 30;
    case "moderate":
      return percentage >= 30 && percentage <= 50;
    case "humid":
      return percentage > 50;
    case "controlled":
      return true;
  }
}

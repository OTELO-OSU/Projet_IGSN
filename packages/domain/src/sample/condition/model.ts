import { z } from "zod";

import { measurementSchema } from "../measurement.ts";
import {
  humidityTypeSchema,
  isHumidityPercentageInRange,
} from "./humidity-type.ts";
import { lightSchema } from "./light.ts";
import { packagingSchema } from "./packaging.ts";
import { pressureTypeSchema } from "./pressure-type.ts";
import { pressureUnitSchema } from "./pressure-unit.ts";
import { storageConditionSchema } from "./storage-condition.ts";
import { temperatureTypeSchema } from "./temperature-type.ts";
import { temperatureUnitSchema } from "./temperature-unit.ts";

// A sample's storage/conditioning state, modeled like the description
// (ADR 0016). Every part is independent and optional, even at publication;
// `sample.condition` as a whole is nullable.
const freeText = z.string().trim().min(1);

// A numeric reading is meaningful only once its category is chosen, so it
// nests under the category: "the value needs its category" holds structurally,
// no refinement to forget (same seam as measurementSchema, ADR 0016).
const temperatureSchema = z.object({
  type: temperatureTypeSchema,
  // Sub-zero storage exists (freezing, liquid nitrogen): no positivity bound.
  measurement: measurementSchema(temperatureUnitSchema, z.number()).nullish(),
});

const humiditySchema = z.object({
  type: humidityTypeSchema,
  // Always a relative-humidity percentage, so no unit to pick.
  percentage: z.number().min(0).max(100).nullish(),
});

const pressureSchema = z.object({
  type: pressureTypeSchema,
  measurement: measurementSchema(pressureUnitSchema).nullish(),
});

export const conditionSchema = z
  .object({
    packaging: packagingSchema.nullish(),
    // Checkbox multi-select; "not filled" is null/absent, never [].
    storageConditions: z.array(storageConditionSchema).min(1).nullish(),
    temperature: temperatureSchema.nullish(),
    humidity: humiditySchema.nullish(),
    light: lightSchema.nullish(),
    pressure: pressureSchema.nullish(),
    // Free text: conditioning details (temperature, preparation protocol...).
    specificConditions: freeText.nullish(),
  })
  .superRefine((condition, ctx) => {
    // params.code lets consumers (the admin form) translate the issue without
    // matching on the message text.
    const storage = condition.storageConditions;
    if (storage != null && new Set(storage).size !== storage.length) {
      ctx.addIssue({
        code: "custom",
        path: ["storageConditions"],
        message: "storage conditions must be unique",
        params: { code: "storage_conditions_duplicate" },
      });
    }
    if (
      storage != null &&
      storage.includes("no_specific_condition") &&
      storage.length > 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["storageConditions"],
        message: "no specific condition excludes every other storage condition",
        params: { code: "storage_conditions_exclusive" },
      });
    }
    if (
      condition.humidity?.percentage != null &&
      !isHumidityPercentageInRange(
        condition.humidity.type,
        condition.humidity.percentage,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["humidity", "percentage"],
        message: "humidity percentage must fall in the selected range",
        params: { code: "humidity_percentage_range" },
      });
    }
  });

export type Condition = z.infer<typeof conditionSchema>;

import { z } from "zod";

import type { ControlledReading } from "./controlled-reading.ts";

import { freeTextSchema } from "../free-text.ts";
import { measurementSchema } from "../measurement.ts";
import {
  READING_STORAGE_CONDITION,
  isReadingControlled,
} from "./controlled-reading.ts";
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

const temperatureSchema = z.object({
  type: temperatureTypeSchema,
  // Sub-zero storage exists (freezing, liquid nitrogen).
  measurement: measurementSchema(temperatureUnitSchema, z.number()).nullish(),
});

const humiditySchema = z.object({
  type: humidityTypeSchema,
  // Always a relative-humidity percentage.
  percentage: z.number().min(0).max(100).nullish(),
});

const pressureSchema = z.object({
  type: pressureTypeSchema,
  measurement: measurementSchema(pressureUnitSchema).nullish(),
});

export const conditionSchema = z
  .object({
    packaging: packagingSchema.nullish(),
    storageConditions: z.array(storageConditionSchema).min(1).nullish(),
    temperature: temperatureSchema.nullish(),
    humidity: humiditySchema.nullish(),
    light: lightSchema.nullish(),
    pressure: pressureSchema.nullish(),
    specificConditions: freeTextSchema.nullish(),
  })
  .superRefine((condition, ctx) => {
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
    for (const reading of Object.keys(
      READING_STORAGE_CONDITION,
    ) as ControlledReading[]) {
      if (
        condition[reading] != null &&
        !isReadingControlled(condition.storageConditions, reading)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [reading],
          message: `${reading} requires its storage condition`,
          params: { code: "reading_without_storage_condition" },
        });
      }
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

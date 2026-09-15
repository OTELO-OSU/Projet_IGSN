import { z } from "zod";

import { humidityTypeSchema } from "../condition/humidity-type.ts";
import { lightSchema } from "../condition/light.ts";
import { packagingSchema } from "../condition/packaging.ts";
import { pressureTypeSchema } from "../condition/pressure-type.ts";
import { pressureUnitSchema } from "../condition/pressure-unit.ts";
import { storageConditionSchema } from "../condition/storage-condition.ts";
import { temperatureTypeSchema } from "../condition/temperature-type.ts";
import { temperatureUnitSchema } from "../condition/temperature-unit.ts";
import { AVAILABILITY_STATUSES } from "../curation/availability-status.ts";
import { EXISTENCE_STATUSES } from "../curation/existence-status.ts";
import { massUnitSchema } from "../description/mass-unit.ts";
import { sizeUnitSchema } from "../description/size-unit.ts";
import { volumeUnitSchema } from "../description/volume-unit.ts";
import { freeTextSchema } from "../free-text.ts";
import { conceptSchema } from "./concept.ts";
import { coreEnum, toCamelCase } from "./core-enum.ts";
import { quantitySchema } from "./quantity.ts";

export const coreExistenceStatus = coreEnum(EXISTENCE_STATUSES, toCamelCase);
export const coreAvailabilityStatus = coreEnum(
  AVAILABILITY_STATUSES,
  toCamelCase,
);

export const corePhysicalDescriptionSchema = z.strictObject({
  orientation: z
    .strictObject({
      oriented: z.boolean(),
      description: freeTextSchema.optional(),
    })
    .optional(),
  openPhysicalDescription: freeTextSchema.optional(),
  dimensions: z
    .strictObject({
      length: quantitySchema(sizeUnitSchema).optional(),
      width: quantitySchema(sizeUnitSchema).optional(),
      thickness: quantitySchema(sizeUnitSchema).optional(),
    })
    .optional(),
  mass: quantitySchema(massUnitSchema).optional(),
  volume: quantitySchema(volumeUnitSchema).optional(),
});

export type CorePhysicalDescription = z.infer<
  typeof corePhysicalDescriptionSchema
>;

const coreRepositorySchema = z.strictObject({
  organization: z
    .strictObject({
      id: z.string().min(1).optional(),
      name: freeTextSchema,
    })
    .optional(),
  collectionName: freeTextSchema.optional(),
  contact: freeTextSchema.optional(),
});

const coreSampleConditionSchema = z.strictObject({
  storageCondition: z
    .array(conceptSchema("sample_condition", storageConditionSchema))
    .min(1)
    .optional(),
  temperature_type: conceptSchema(
    "sample_condition",
    temperatureTypeSchema,
  ).optional(),
  temperature: quantitySchema(temperatureUnitSchema).optional(),
  humidityType: conceptSchema("humidity-type", humidityTypeSchema).optional(),
  relativeHumidityPercent: z.number().min(0).max(100).optional(),
  pressureType: conceptSchema("pressure-type", pressureTypeSchema).optional(),
  pressure: quantitySchema(pressureUnitSchema).optional(),
  lightCondition: conceptSchema("light", lightSchema).optional(),
  packaging: conceptSchema("packaging", packagingSchema).optional(),
  description: freeTextSchema.optional(),
});

export const coreCurationSchema = z.strictObject({
  existenceStatus: coreExistenceStatus.schema,
  availabilityStatus: coreAvailabilityStatus.schema,
  currentRepository: coreRepositorySchema.optional(),
  originalRepository: coreRepositorySchema.optional(),
  sampleCondition: coreSampleConditionSchema.optional(),
});

export type CoreCuration = z.infer<typeof coreCurationSchema>;

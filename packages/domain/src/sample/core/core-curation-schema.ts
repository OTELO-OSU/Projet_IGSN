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
      oriented: z.boolean().meta({
        description:
          "Whether the orientation of the sample was recorded when it was collected.",
      }),
      description: freeTextSchema
        .meta({ description: "Free text explaining that orientation." })
        .optional(),
    })
    .meta({ description: "Orientation the sample was collected with." })
    .optional(),
  openPhysicalDescription: freeTextSchema
    .meta({ description: "Free-text physical description of the sample." })
    .optional(),
  dimensions: z
    .strictObject({
      length: quantitySchema(sizeUnitSchema)
        .meta({ description: "Length of the sample." })
        .optional(),
      width: quantitySchema(sizeUnitSchema)
        .meta({ description: "Width of the sample." })
        .optional(),
      thickness: quantitySchema(sizeUnitSchema)
        .meta({ description: "Thickness of the sample." })
        .optional(),
    })
    .meta({ description: "Measured dimensions of the sample." })
    .optional(),
  mass: quantitySchema(massUnitSchema)
    .meta({ description: "Mass of the sample." })
    .optional(),
  volume: quantitySchema(volumeUnitSchema)
    .meta({ description: "Volume of the sample." })
    .optional(),
});

export type CorePhysicalDescription = z.infer<
  typeof corePhysicalDescriptionSchema
>;

const coreRepositorySchema = z.strictObject({
  organization: z
    .strictObject({
      id: z
        .string()
        .min(1)
        .meta({ description: "Identifier of the institution, a ROR URI." })
        .optional(),
      name: freeTextSchema.meta({ description: "Name of the institution." }),
    })
    .meta({ description: "Institution archiving the sample." })
    .optional(),
  collectionName: freeTextSchema
    .meta({ description: "Name of the collection the sample belongs to." })
    .optional(),
  contactFirstName: freeTextSchema
    .meta({
      description: "First name of the contact person at that institution.",
    })
    .optional(),
  contactLastName: freeTextSchema
    .meta({
      description: "Last name of the contact person at that institution.",
    })
    .optional(),
});

const coreSampleConditionSchema = z.strictObject({
  storageCondition: z
    .array(conceptSchema("sample_condition", storageConditionSchema))
    .min(1)
    .meta({
      description:
        "Which storage parameters are controlled for the sample, each opening the matching condition below.",
    })
    .optional(),
  temperature_type: conceptSchema("sample_condition", temperatureTypeSchema)
    .meta({ description: "Temperature regime the sample is kept at." })
    .optional(),
  temperature: quantitySchema(temperatureUnitSchema)
    .meta({ description: "Temperature the sample is kept at." })
    .optional(),
  humidityType: conceptSchema("humidity-type", humidityTypeSchema)
    .meta({ description: "Humidity regime the sample is kept at." })
    .optional(),
  relativeHumidityPercent: z
    .number()
    .min(0)
    .max(100)
    .meta({
      description: "Relative humidity the sample is kept at, as a percentage.",
    })
    .optional(),
  pressureType: conceptSchema("pressure-type", pressureTypeSchema)
    .meta({ description: "Pressure regime the sample is kept at." })
    .optional(),
  pressure: quantitySchema(pressureUnitSchema)
    .meta({ description: "Pressure the sample is kept at." })
    .optional(),
  lightCondition: conceptSchema("light", lightSchema)
    .meta({ description: "Light exposure the sample is kept under." })
    .optional(),
  packaging: conceptSchema("packaging", packagingSchema)
    .meta({ description: "Packaging the sample is kept in." })
    .optional(),
  description: freeTextSchema
    .meta({
      description: "Free text about any other condition the sample requires.",
    })
    .optional(),
});

export const coreCurationSchema = z.strictObject({
  existenceStatus: coreExistenceStatus.schema.meta({
    description:
      "Whether the sample still exists; required on a published sample.",
  }),
  availabilityStatus: coreAvailabilityStatus.schema.meta({
    description:
      "Whether the sample can be requested; required on a published sample.",
  }),
  currentRepository: coreRepositorySchema
    .meta({ description: "Institution currently holding the sample." })
    .optional(),
  originalRepository: coreRepositorySchema
    .meta({ description: "Institution that first held the sample." })
    .optional(),
  sampleCondition: coreSampleConditionSchema
    .meta({ description: "Conditions the sample must be kept in." })
    .optional(),
});

export type CoreCuration = z.infer<typeof coreCurationSchema>;

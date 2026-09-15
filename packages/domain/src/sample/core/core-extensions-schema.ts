import { z } from "zod";

import {
  geologicalAgeSchema,
  type GeologicalAge,
} from "../age/geological-age.ts";
import { NUMERIC_UNITS } from "../age/numeric-unit.ts";
import { yearsUnitSchema } from "../age/years-unit.ts";
import { pressureUnitSchema } from "../condition/pressure-unit.ts";
import { temperatureUnitSchema } from "../condition/temperature-unit.ts";
import { elementSchema } from "../element/vocabulary.ts";
import { freeTextSchema } from "../free-text.ts";
import { experimentDurationUnitSchema } from "../synthetic-details/experiment-duration-unit.ts";
import { experimentTypeSchema } from "../synthetic-details/experiment-type.ts";
import { finalProductSchema } from "../synthetic-details/final-product.ts";
import { startingMaterialNatureSchema } from "../synthetic-details/starting-material-nature.ts";
import { startingMaterialSchema } from "../synthetic-details/starting-material.ts";
import { conceptSchema } from "./concept.ts";
import { coreEnum } from "./core-enum.ts";
import { quantitySchema } from "./quantity.ts";

export const coreNumericAgeUnit = coreEnum(NUMERIC_UNITS, (unit) =>
  unit === "a" ? unit : unit.charAt(0).toUpperCase() + unit.slice(1),
);

export const coreNumericAgeEra = coreEnum(yearsUnitSchema.options, (unit) =>
  unit === "cal_bp" ? "calBP" : unit.toUpperCase(),
);

// The stratigraphic time scale is a 1-based rank, ICS1 (youngest) to ICS49.
const chronostratigraphySchema = z.string().regex(/^ICS([1-9]|[1-4][0-9])$/);

export const toChronostratigraphy = (rank: GeologicalAge): string =>
  `ICS${rank}`;

export const fromChronostratigraphy = (value: string): GeologicalAge =>
  geologicalAgeSchema.parse(Number(value.slice("ICS".length)));

const hazardSchema = z.strictObject({
  flag: z.boolean(),
  explanation: freeTextSchema.optional(),
});

export const coreExtensionsSchema = z.strictObject({
  geology: z
    .strictObject({
      numericAge: z
        .strictObject({
          min: z.number().optional(),
          max: z.number().optional(),
          unit: coreNumericAgeUnit.schema.optional(),
          era: coreNumericAgeEra.schema.optional(),
        })
        .optional(),
      chronostratigraphy: z
        .strictObject({
          min: chronostratigraphySchema.optional(),
          max: chronostratigraphySchema.optional(),
          unit: freeTextSchema.optional(),
        })
        .optional(),
      economic: z
        .strictObject({
          depositName: freeTextSchema.optional(),
          depositDescription: freeTextSchema.optional(),
          resourceTypePrecision: freeTextSchema.optional(),
          interestElements: z
            .array(conceptSchema("element", elementSchema))
            .min(1)
            .optional(),
        })
        .optional(),
    })
    .optional(),
  safety: z
    .strictObject({
      radioactivity: hazardSchema.optional(),
      asbestos: hazardSchema.optional(),
      chemical: hazardSchema.optional(),
    })
    .optional(),
  experiment: z
    .strictObject({
      startingMaterial: startingMaterialSchema.optional(),
      startingMaterialNature: startingMaterialNatureSchema.optional(),
      startingMaterialComposition: freeTextSchema.optional(),
      finalProduct: finalProductSchema.optional(),
      experimentType: conceptSchema(
        "experiment-type",
        experimentTypeSchema,
      ).optional(),
      duration: quantitySchema(experimentDurationUnitSchema).optional(),
      temperature: quantitySchema(temperatureUnitSchema).optional(),
      pressure: quantitySchema(pressureUnitSchema).optional(),
      purpose: freeTextSchema.optional(),
      equipment: freeTextSchema.optional(),
    })
    .optional(),
});

export type CoreExtensions = z.infer<typeof coreExtensionsSchema>;

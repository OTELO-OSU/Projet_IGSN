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
import { platformTypeSchema } from "../scientific-context/platform-type.ts";
import { experimentDurationUnitSchema } from "../synthetic-details/experiment-duration-unit.ts";
import { experimentTypeSchema } from "../synthetic-details/experiment-type.ts";
import { finalProductSchema } from "../synthetic-details/final-product.ts";
import { startingMaterialNatureSchema } from "../synthetic-details/starting-material-nature.ts";
import { startingMaterialSchema } from "../synthetic-details/starting-material.ts";
import { conceptSchema } from "./concept.ts";
import { corePersonSchema } from "./core-agent-schema.ts";
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
  flag: z
    .boolean()
    .meta({ description: "Whether the sample presents that hazard." }),
  explanation: freeTextSchema
    .meta({
      description:
        "Free text about that hazard, accepted only once the flag is set.",
    })
    .optional(),
});

export const coreExtensionsSchema = z.strictObject({
  geology: z
    .strictObject({
      numericAge: z
        .strictObject({
          min: z
            .number()
            .meta({ description: "Lower bound of the numeric age." })
            .optional(),
          max: z
            .number()
            .meta({ description: "Upper bound of the numeric age." })
            .optional(),
          unit: coreNumericAgeUnit.schema
            .meta({ description: "Unit both bounds are counted in." })
            .optional(),
          era: coreNumericAgeEra.schema
            .meta({
              description:
                "Reference both bounds are counted from, calBP being ours.",
            })
            .optional(),
        })
        .meta({ description: "Numeric age of the sample." })
        .optional(),
      chronostratigraphy: z
        .strictObject({
          min: chronostratigraphySchema
            .meta({
              description:
                "Youngest stratigraphic stage of the sample, ICS1 to ICS49 down the time scale.",
            })
            .optional(),
          max: chronostratigraphySchema
            .meta({
              description:
                "Oldest stratigraphic stage of the sample, ICS1 to ICS49 down the time scale.",
            })
            .optional(),
          unit: freeTextSchema
            .meta({
              description:
                "Name of the stratigraphic unit the sample belongs to.",
            })
            .optional(),
        })
        .meta({ description: "Stratigraphic age of the sample." })
        .optional(),
      economic: z
        .strictObject({
          depositName: freeTextSchema
            .meta({ description: "Name of the deposit the sample comes from." })
            .optional(),
          depositDescription: freeTextSchema
            .meta({ description: "Free-text description of that deposit." })
            .optional(),
          resourceTypePrecision: freeTextSchema
            .meta({
              description:
                "Free text refining the resource type of the sample.",
            })
            .optional(),
          interestElements: z
            .array(conceptSchema("element", elementSchema))
            .min(1)
            .meta({
              description:
                "Chemical elements the sample is of economic interest for.",
            })
            .optional(),
        })
        .meta({ description: "Economic interest of the sample." })
        .optional(),
    })
    .meta({ description: "Geological metadata of the sample." })
    .optional(),
  safety: z
    .strictObject({
      radioactivity: hazardSchema
        .meta({ description: "Radioactivity hazard of the sample." })
        .optional(),
      asbestos: hazardSchema
        .meta({ description: "Asbestos hazard of the sample." })
        .optional(),
      chemical: hazardSchema
        .meta({ description: "Chemical hazard of the sample." })
        .optional(),
    })
    .meta({ description: "Hazards handling the sample presents." })
    .optional(),
  experiment: z
    .strictObject({
      startingMaterial: startingMaterialSchema
        .meta({ description: "Material the synthesis started from." })
        .optional(),
      startingMaterialNature: startingMaterialNatureSchema
        .meta({ description: "Nature of that starting material." })
        .optional(),
      startingMaterialComposition: freeTextSchema
        .meta({ description: "Composition of that starting material." })
        .optional(),
      finalProduct: finalProductSchema
        .meta({ description: "Product the synthesis yielded." })
        .optional(),
      experimentType: conceptSchema("experiment-type", experimentTypeSchema)
        .meta({
          description:
            "Type of experiment the sample was synthesized by, the value the reverse mapping reads.",
        })
        .optional(),
      duration: quantitySchema(experimentDurationUnitSchema)
        .meta({ description: "How long the synthesis lasted." })
        .optional(),
      temperature: quantitySchema(temperatureUnitSchema)
        .meta({ description: "Temperature the synthesis ran at." })
        .optional(),
      pressure: quantitySchema(pressureUnitSchema)
        .meta({ description: "Pressure the synthesis ran at." })
        .optional(),
      purpose: freeTextSchema
        .meta({ description: "Purpose the sample was synthesized for." })
        .optional(),
      equipment: freeTextSchema
        .meta({ description: "Equipment the synthesis used." })
        .optional(),
      operator: corePersonSchema
        .meta({
          description:
            "Person who ran the synthesis, with their research structures as affiliations.",
        })
        .optional(),
    })
    .meta({ description: "Synthesis parameters of a synthetic sample." })
    .optional(),
  fieldwork: z
    .strictObject({
      platformType: conceptSchema("platform-type", platformTypeSchema)
        .meta({
          description: "Kind of platform the sample was collected from.",
        })
        .optional(),
      launchPlatformName: freeTextSchema
        .meta({ description: "Name of that platform." })
        .optional(),
    })
    .meta({ description: "Fieldwork conditions of a field sample." })
    .optional(),
});

export type CoreExtensions = z.infer<typeof coreExtensionsSchema>;

import { z } from "zod";

import { orcidSchema } from "../../user/orcid.ts";
import { pressureUnitSchema } from "../condition/pressure-unit.ts";
import { temperatureUnitSchema } from "../condition/temperature-unit.ts";
import { dateRangeSchema } from "../date-range.ts";
import { freeTextSchema } from "../free-text.ts";
import { measurementSchema } from "../measurement.ts";
import { uniqueRorArraySchema } from "../scientific-context/model.ts";
import { experimentDurationUnitSchema } from "./experiment-duration-unit.ts";
import { experimentTypeSchema } from "./experiment-type.ts";
import { finalProductSchema } from "./final-product.ts";
import { startingMaterialNatureSchema } from "./starting-material-nature.ts";
import { startingMaterialSchema } from "./starting-material.ts";

export const syntheticDetailsSchema = z.object({
  startingMaterial: startingMaterialSchema.nullish(),
  startingMaterialNature: startingMaterialNatureSchema.nullish(),
  startingMaterialComposition: freeTextSchema.nullish(),
  finalProduct: finalProductSchema.nullish(),
  experimentType: experimentTypeSchema.nullish(),
  experimentDuration: measurementSchema(experimentDurationUnitSchema).nullish(),
  experimentDurationNotRelevant: z.boolean().nullish(),
  synthesisDate: dateRangeSchema("synthesis_date").nullish(),
  operatorName: freeTextSchema.nullish(),
  operatorOrcid: orcidSchema.nullish(),
  researchStructure: uniqueRorArraySchema(
    "synthetic_research_structure_duplicate",
  ),
  temperature: measurementSchema(temperatureUnitSchema, z.number()).nullish(),
  pressure: measurementSchema(pressureUnitSchema).nullish(),
  experimentalProtocol: freeTextSchema.nullish(),
  experimentPurpose: freeTextSchema.nullish(),
  equipmentUsed: freeTextSchema.nullish(),
});

export type SyntheticDetails = z.infer<typeof syntheticDetailsSchema>;

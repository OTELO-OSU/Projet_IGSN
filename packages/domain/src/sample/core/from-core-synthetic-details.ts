import type { z } from "zod";

import type { createSyntheticDetailsSchema } from "../synthetic-details/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { orNull } from "./core-optional.ts";
import { CORE_SYNTHESIS_STEP, fromRorUri } from "./core-production-schema.ts";
import { fromCoreStepDate } from "./from-core-date-range.ts";
import { fromQuantity } from "./quantity.ts";

export function fromCoreSyntheticDetails(
  body: CoreSampleBody,
): z.input<typeof createSyntheticDetailsSchema> | null {
  const step = body.production.processSteps?.find(
    (candidate) => candidate.stepType === CORE_SYNTHESIS_STEP,
  );
  const experiment = body.extensions?.experiment;
  if (experiment == null && step == null) return null;
  const operator = experiment?.operator;
  return {
    startingMaterial: experiment?.startingMaterial ?? null,
    startingMaterialNature: experiment?.startingMaterialNature ?? null,
    startingMaterialComposition:
      experiment?.startingMaterialComposition ?? null,
    finalProduct: experiment?.finalProduct ?? null,
    experimentType: experiment?.experimentType?.id ?? null,
    experimentDuration: orNull(experiment?.duration, fromQuantity),
    synthesisDate: fromCoreStepDate(step),
    operatorFirstname: operator?.firstname ?? null,
    operatorLastname: operator?.lastname ?? null,
    researchStructure:
      operator?.affiliations?.map((affiliation) =>
        fromRorUri(affiliation.id ?? ""),
      ) ?? null,
    temperature: orNull(experiment?.temperature, fromQuantity),
    pressure: orNull(experiment?.pressure, fromQuantity),
    experimentalProtocol: step?.description ?? null,
    experimentPurpose: experiment?.purpose ?? null,
    equipmentUsed: experiment?.equipment ?? null,
  };
}

import type { SyntheticDetails } from "../synthetic-details/model.ts";
import type { CoreProcessStep } from "./core-production-schema.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { orNull } from "./core-optional.ts";
import { fromRorUri } from "./core-production-schema.ts";
import { fromCoreDateRange } from "./from-core-date-range.ts";
import { responsibilityFinders } from "./from-core-responsibility.ts";
import { fromQuantity } from "./quantity.ts";

function fromCoreSynthesisDate(
  step: CoreProcessStep | undefined,
): SyntheticDetails["synthesisDate"] {
  if (step?.timestampStart == null || step.timestampEnd == null) return null;
  return fromCoreDateRange({
    start: step.timestampStart,
    end: step.timestampEnd,
    precision: step.timestampPrecision,
    timeZone: step.timestampTimeZone,
  });
}

export function fromCoreSyntheticDetails(
  body: CoreSampleBody,
): SyntheticDetails | null {
  const { personOf, orcidOf } = responsibilityFinders(body.responsibility);
  const researcher = personOf("Researcher");
  const step = body.production.processSteps?.[0];
  const experiment = body.extensions?.experiment;
  if (experiment == null && step == null && researcher == null) return null;
  return {
    startingMaterial: experiment?.startingMaterial ?? null,
    startingMaterialNature: experiment?.startingMaterialNature ?? null,
    startingMaterialComposition:
      experiment?.startingMaterialComposition ?? null,
    finalProduct: experiment?.finalProduct ?? null,
    experimentType: experiment?.experimentType?.id ?? null,
    experimentDuration: orNull(experiment?.duration, fromQuantity),
    synthesisDate: fromCoreSynthesisDate(step),
    operatorFirstname: researcher?.firstname ?? null,
    operatorLastname: researcher?.lastname ?? null,
    operatorOrcid: orcidOf("Researcher"),
    researchStructure:
      researcher?.affiliations?.map((affiliation) =>
        fromRorUri(affiliation.id ?? ""),
      ) ?? null,
    temperature: orNull(experiment?.temperature, fromQuantity),
    pressure: orNull(experiment?.pressure, fromQuantity),
    experimentalProtocol: step?.description ?? null,
    experimentPurpose: experiment?.purpose ?? null,
    equipmentUsed: experiment?.equipment ?? null,
  };
}

import type { Sample } from "../sample.ts";
import type { CoreExtensions } from "./core-extensions-schema.ts";

import { organizationLabel } from "../../institutional-group/label.ts";
import { toConcept } from "./concept.ts";
import {
  coreNumericAgeEra,
  coreNumericAgeUnit,
  toChronostratigraphy,
} from "./core-extensions-schema.ts";
import { isEmpty, optionalConcept, optionalQuantity } from "./core-optional.ts";
import { toRorUri } from "./core-production-schema.ts";
import { toOrcidUri } from "./core-sample-schema.ts";

export function toCoreExtensions(sample: Sample): CoreExtensions | undefined {
  const age = sample.age;
  const security = sample.security;
  const details = sample.syntheticDetails;
  const numericAge = {
    min: age?.numericAgeMin ?? undefined,
    max: age?.numericAgeMax ?? undefined,
    unit:
      age?.numericAgeUnit == null
        ? undefined
        : coreNumericAgeUnit.toCore(age.numericAgeUnit),
    era:
      age?.numericAgeYearsUnit == null
        ? undefined
        : coreNumericAgeEra.toCore(age.numericAgeYearsUnit),
  };
  const chronostratigraphy = {
    min:
      age?.geologicalAgeMin == null
        ? undefined
        : toChronostratigraphy(age.geologicalAgeMin),
    max:
      age?.geologicalAgeMax == null
        ? undefined
        : toChronostratigraphy(age.geologicalAgeMax),
    unit: age?.geologicalUnit ?? undefined,
  };
  const economic = {
    depositName: sample.economicDepositName ?? undefined,
    depositDescription: sample.economicDepositDescription ?? undefined,
    resourceTypePrecision: sample.economicResourceTypePrecision ?? undefined,
    interestElements:
      sample.economicInterestElements.length === 0
        ? undefined
        : sample.economicInterestElements.map((element) =>
            toConcept("element", element),
          ),
  };
  const hazard = (
    flag: boolean | null | undefined,
    explanation: string | null | undefined,
  ) =>
    flag == null ? undefined : { flag, explanation: explanation ?? undefined };
  const safety = {
    radioactivity: hazard(
      security?.radioactivity,
      security?.radioactivityExplanation,
    ),
    asbestos: hazard(security?.asbestosRich, security?.asbestosExplanation),
    chemical: hazard(security?.chemicalRisk, security?.chemicalRiskExplanation),
  };
  const operator = {
    id:
      details?.operatorOrcid == null
        ? undefined
        : toOrcidUri(details.operatorOrcid),
    firstname: details?.operatorFirstname ?? undefined,
    lastname: details?.operatorLastname ?? undefined,
    affiliations: details?.researchStructure?.map((ror) => ({
      id: toRorUri(ror),
      name: organizationLabel(ror),
    })),
  };
  const experiment = {
    startingMaterial: details?.startingMaterial ?? undefined,
    startingMaterialNature: details?.startingMaterialNature ?? undefined,
    startingMaterialComposition:
      details?.startingMaterialComposition ?? undefined,
    finalProduct: details?.finalProduct ?? undefined,
    experimentType: optionalConcept("experiment-type", details?.experimentType),
    duration: optionalQuantity(details?.experimentDuration),
    temperature: optionalQuantity(details?.temperature),
    pressure: optionalQuantity(details?.pressure),
    purpose: details?.experimentPurpose ?? undefined,
    equipment: details?.equipmentUsed ?? undefined,
    operator: isEmpty(operator) ? undefined : operator,
  };
  const context = sample.scientificContext;
  const fieldSample =
    context?.provenanceStatus === "field_sample" ? context : null;
  const fieldwork = {
    platformType: optionalConcept("platform-type", fieldSample?.platformType),
    launchPlatformName: fieldSample?.launchPlatformName ?? undefined,
  };
  const geology = {
    numericAge: isEmpty(numericAge) ? undefined : numericAge,
    chronostratigraphy: isEmpty(chronostratigraphy)
      ? undefined
      : chronostratigraphy,
    economic: isEmpty(economic) ? undefined : economic,
  };
  const extensions = {
    geology: isEmpty(geology) ? undefined : geology,
    safety: isEmpty(safety) ? undefined : safety,
    experiment: isEmpty(experiment) ? undefined : experiment,
    fieldwork: isEmpty(fieldwork) ? undefined : fieldwork,
  };
  return isEmpty(extensions) ? undefined : extensions;
}

import type { CoreSample } from "../core/core-sample-schema.ts";
import type {
  OmsFeature,
  OmsSample,
  OmsSampleCollection,
} from "./oms-schema.ts";

import { parentIgsnOf } from "../core/core-relation-schema.ts";
import { mainTitleOf } from "../core/core-sample-schema.ts";
import {
  OMS_SAMPLE_COLLECTION_CONTEXT,
  OMS_SAMPLE_CONTEXT,
} from "./oms-schema.ts";
import { toOmsPreparationSteps, toOmsSampling } from "./to-oms-sampling.ts";

function toOmsFeature(core: CoreSample): OmsFeature {
  const { classification, identification, production } = core;
  const location = production.location;
  return {
    "@id": identification.landingPage,
    type: "Feature",
    featureType: "sosa:Sample",
    geometry: location?.geometry ?? null,
    properties: {
      sampleIdentifier: identification.sampleIdentifier,
      name: mainTitleOf(identification.titles)?.value ?? "",
      localName: identification.localName,
      specimenType: [
        classification.natureOfSample,
        ...classification.sampleObjectTypes.slice(0, 1),
      ],
      materialCategory: classification.materialCategories[0],
      contextCategory: classification.contextCategories,
      placeName: location?.placeNames?.[0],
      locationDescription: location?.locationDescription,
      verticalExtent: location?.verticalExtent,
      countryCode: location?.countryCodes?.[0],
      oceanOrSea: location?.oceanOrSea,
      navigationMethod: location?.navigationMethod,
      isResultOf: toOmsSampling(core),
      preparationStep: toOmsPreparationSteps(production.processSteps),
      hasOriginalSample: (core.relations ?? []).flatMap((relation) =>
        parentIgsnOf(relation) == null
          ? []
          : [relation.targetURI ?? relation.targetIdentifier.value],
      ),
      rightsURI: core.rightsAndAccess.rightsURIs[0],
    },
  };
}

export function toOmsSample(core: CoreSample): OmsSample {
  return { "@context": OMS_SAMPLE_CONTEXT, ...toOmsFeature(core) };
}

export function toOmsSampleCollection(
  cores: CoreSample[],
  total: number,
): OmsSampleCollection {
  const features = cores.map((core) => toOmsFeature(core));
  return {
    "@context": OMS_SAMPLE_COLLECTION_CONTEXT,
    type: "FeatureCollection",
    featureType: "sosa:SampleCollection",
    numberMatched: total,
    numberReturned: features.length,
    features,
  };
}

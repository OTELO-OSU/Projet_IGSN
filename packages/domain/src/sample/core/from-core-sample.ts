import type { z } from "zod";

import type { Igsn } from "../../igsn/model.ts";
import type { createSampleSchema } from "../sample.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import {
  coreAvailabilityStatus,
  coreExistenceStatus,
} from "./core-curation-schema.ts";
import { orNull } from "./core-optional.ts";
import { parentIgsnOf } from "./core-relation-schema.ts";
import { contextCategoryFinders } from "./from-core-context-category.ts";
import { fromCoreCondition, fromCoreRepository } from "./from-core-curation.ts";
import { fromCoreAge, fromCoreSecurity } from "./from-core-extensions.ts";
import { fromCoreLocation } from "./from-core-location.ts";
import { fromCoreRelation } from "./from-core-relation.ts";
import { fromCoreScientificContext } from "./from-core-scientific-context.ts";
import { fromCoreSyntheticDetails } from "./from-core-synthetic-details.ts";
import { fromQuantity } from "./quantity.ts";

export type CoreSampleParent = { igsn: Igsn; relationIndex: number };

export type ReversedCoreSample = {
  sample: z.input<typeof createSampleSchema>;
  parents: CoreSampleParent[];
};

export function fromCoreSample(body: CoreSampleBody): ReversedCoreSample {
  const production = body.production;
  const parents: CoreSampleParent[] = [];
  const relations = [];
  for (const [index, relation] of (body.relations ?? []).entries()) {
    const igsn = parentIgsnOf(relation);
    if (igsn == null) {
      relations.push(fromCoreRelation(relation));
      continue;
    }
    parents.push({ igsn, relationIndex: index });
  }

  const { bySchemeName } = contextCategoryFinders(
    body.classification.contextCategories,
  );
  const material = bySchemeName("otelo:material");
  const physical = body.physicalDescription;
  const economic = body.extensions?.geology?.economic;

  return {
    parents,
    sample: {
      name: body.identification.titles[0]?.value ?? "",
      nature: body.classification.natureOfSample.id,
      type: body.classification.sampleObjectTypes[0]?.id ?? null,
      material: material?.id ?? null,
      materialOtherName: material?.notation ?? null,
      texture: bySchemeName("otelo:texture")?.id ?? null,
      metamorphicFacies: bySchemeName("otelo:metamorphic-facies")?.id ?? null,
      metamorphicFabric: bySchemeName("otelo:metamorphic-fabric")?.id ?? null,
      geomorphologicalEnvironment:
        bySchemeName("otelo:geomorphologicalContext")?.id ?? null,
      resourceType: bySchemeName("otelo:resource-type")?.id ?? null,
      geologicalContextDescription:
        bySchemeName("otelo:geologicalContext")?.id ?? null,
      collectionMethod: production.collectionMethod?.id ?? null,
      collectionMethodDescription:
        production.collectionMethodDescription ?? null,
      specificName: body.identification.localName ?? null,
      location: fromCoreLocation(production.location),
      description: {
        collectionDate:
          production.collectionDatePrecision === "hour"
            ? {
                precision: "hour",
                start: production.collection_date_start,
                end: production.collection_date_end,
                timeZone: production.collectionDateTimeZone ?? "",
              }
            : {
                precision: "day",
                start: production.collection_date_start,
                end: production.collection_date_end,
              },
        oriented: physical?.orientation?.oriented ?? null,
        orientationExplanation: physical?.orientation?.description ?? null,
        openDescription: physical?.openPhysicalDescription ?? null,
        length: orNull(physical?.dimensions?.length, fromQuantity),
        width: orNull(physical?.dimensions?.width, fromQuantity),
        thickness: orNull(physical?.dimensions?.thickness, fromQuantity),
        mass: orNull(physical?.mass, fromQuantity),
        volume: orNull(physical?.volume, fromQuantity),
      },
      condition: fromCoreCondition(body.curation),
      repository: fromCoreRepository(body.curation),
      scientificContext: fromCoreScientificContext(body),
      syntheticDetails: fromCoreSyntheticDetails(body),
      age: fromCoreAge(body.extensions),
      relations,
      security: fromCoreSecurity(body.extensions),
      existenceStatus: coreExistenceStatus.fromCore(
        body.curation.existenceStatus,
      ),
      availabilityStatus: coreAvailabilityStatus.fromCore(
        body.curation.availabilityStatus,
      ),
      economicInterestElements:
        economic?.interestElements?.map((concept) => concept.id) ?? [],
      economicResourceTypePrecision: economic?.resourceTypePrecision ?? null,
      economicDepositName: economic?.depositName ?? null,
      economicDepositDescription: economic?.depositDescription ?? null,
      manualGroupIds: body.manualGroups?.map((group) => group.id) ?? [],
    },
  };
}

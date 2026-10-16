import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { allowsSpecificName } from "@projet-igsn/domain/sample/material/allows-specific-name";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";

import type { SampleDraft } from "#/samples/sample-draft-schema.ts";

import { toAgeInput } from "#/samples/age-form.ts";
import { composeCondition } from "#/samples/compose-condition.ts";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeEconomicInterest } from "#/samples/compose-economic-interest.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { composeMineralClassifications } from "#/samples/compose-mineral-classifications.ts";
import { composeProcessSteps } from "#/samples/compose-process-steps.ts";
import { composeRelations } from "#/samples/compose-relations.ts";
import { composeRepository } from "#/samples/compose-repository.ts";
import { composeScientificContext } from "#/samples/compose-scientific-context.ts";
import { composeSecurity } from "#/samples/compose-security.ts";
import { composeSyntheticDetails } from "#/samples/compose-synthetic-details.ts";
import { isLocated } from "#/samples/is-located.ts";

export const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
  const locationAllowed = allowsLocation(material);
  const condition = composeCondition(draft.condition);
  const age = toAgeInput(draft.age);
  const scientificContext = composeScientificContext(draft.scientificContext);
  const repository = composeRepository(draft.repository);
  const relations = composeRelations(draft.relations);
  const processSteps = composeProcessSteps(draft.processSteps);
  const mineralClassifications = composeMineralClassifications(
    draft.mineralClassifications,
    material,
  );
  const economic = composeEconomicInterest(draft, material);
  const syntheticDetails = composeSyntheticDetails(
    draft.syntheticDetails,
    material,
  );
  const localId = draft.localId?.trim() || null;
  const type = composeHierarchyValue(draft.typePath);
  return {
    name: draft.name,
    localId,
    ...(localId
      ? { localIdDescription: draft.localIdDescription?.trim() || null }
      : {}),
    nature: draft.nature ?? null,
    type,
    material,
    ...(draft.texture ? { texture: draft.texture } : {}),
    ...(draft.metamorphicFacies
      ? { metamorphicFacies: draft.metamorphicFacies }
      : {}),
    ...(draft.metamorphicFabric
      ? { metamorphicFabric: draft.metamorphicFabric }
      : {}),
    collectionMethod: composeHierarchyValue(draft.collectionMethodPath),
    collectionMethodDescription:
      draft.collectionMethodDescription?.trim() || null,
    specificName: allowsSpecificName(material)
      ? draft.specificName?.trim() || null
      : null,
    geologicalContextDescription: locationAllowed
      ? draft.geologicalContextDescription?.trim() || null
      : null,
    physiographicEnvironment: locationAllowed
      ? composeHierarchyValue(draft.physiographicEnvironmentPath)
      : null,
    location: isLocated(draft) ? composeLocation(draft.location) : null,
    description: composeDescription(draft.description),
    ...(condition ? { condition } : {}),
    security: composeSecurity(draft.security),
    ...(scientificContext ? { scientificContext } : {}),
    ...(repository ? { repository } : {}),
    ...(syntheticDetails ? { syntheticDetails } : {}),
    ...(draft.existenceStatus
      ? { existenceStatus: draft.existenceStatus }
      : {}),
    ...(draft.availabilityStatus
      ? { availabilityStatus: draft.availabilityStatus }
      : {}),
    ...(age ? { age } : {}),
    ...(relations.length > 0 ? { relations } : {}),
    ...(processSteps.length > 0 ? { processSteps } : {}),
    ...(mineralClassifications.length > 0 ? { mineralClassifications } : {}),
    manualGroupIds: draft.manualGroupIds,
    ...(draft.parentIds.length > 0 ? { parentIds: draft.parentIds } : {}),
    ...(isVirtualSample(type)
      ? { childIds: draft.childIds }
      : { seriesId: draft.seriesId }),
    ...economic,
  };
};

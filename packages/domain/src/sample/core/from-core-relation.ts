import type { CoreRelation } from "./core-relation-schema.ts";

import {
  coreIdentifierType,
  coreRelationType,
  coreTargetResourceType,
} from "./core-relation-schema.ts";

export function fromCoreRelation(relation: CoreRelation) {
  return {
    relationType: coreRelationType.fromCore(relation.relationType),
    identifierType: coreIdentifierType.fromCore(
      relation.targetIdentifier.identifierType,
    ),
    identifier: relation.targetIdentifier.value,
    targetTitle: relation.targetTitles[0]?.value ?? "",
    targetResourceType: coreTargetResourceType.fromCore(
      relation.targetResourceType,
    ),
    relationTypeInformation: relation.relationTypeInformation ?? null,
    relatedMetadataScheme: relation.relatedMetadataScheme ?? null,
    schemeURI: relation.schemeURI ?? null,
    schemeType: relation.schemeType ?? null,
    description: relation.description ?? null,
  };
}

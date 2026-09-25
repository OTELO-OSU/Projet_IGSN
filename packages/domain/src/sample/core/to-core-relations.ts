import type { Sample } from "../sample.ts";
import type { CoreRelation } from "./core-relation-schema.ts";

import { relationTargetHref } from "../relation/relation-target-href.ts";
import {
  coreIdentifierType,
  coreRelationType,
  coreTargetResourceType,
  PARENT_RELATION_TYPE,
  toParentIdentifierType,
} from "./core-relation-schema.ts";
import { sampleLandingPage } from "./sample-landing-page.ts";

export function toCoreRelations(
  sample: Sample,
  frontendUrl: string,
): CoreRelation[] | undefined {
  const relations: CoreRelation[] = sample.relations.map((relation) => ({
    relationType: coreRelationType.toCore(relation.relationType),
    targetIdentifier: {
      value: relation.identifier,
      identifierType: coreIdentifierType.toCore(relation.identifierType),
    },
    targetURI: relationTargetHref(relation.identifier) ?? undefined,
    targetTitles:
      relation.targetTitle == null
        ? undefined
        : [{ value: relation.targetTitle, titleType: "Main" as const }],
    targetResourceType: coreTargetResourceType.toCore(
      relation.targetResourceType ?? "other",
    ),
    relatedMetadataScheme: relation.relatedMetadataScheme ?? undefined,
    schemeURI: relation.schemeURI ?? undefined,
    schemeType: relation.schemeType ?? undefined,
    description: relation.description ?? undefined,
  }));
  for (const parent of sample.parents) {
    relations.push({
      relationType: PARENT_RELATION_TYPE,
      targetIdentifier: {
        value: parent.igsn,
        identifierType: toParentIdentifierType(parent.igsn),
      },
      targetURI: sampleLandingPage(parent.igsn, frontendUrl),
      targetTitles: [{ value: parent.name, titleType: "Main" }],
      targetResourceType: coreTargetResourceType.toCore("physical_object"),
    });
  }
  return relations.length === 0 ? undefined : relations;
}

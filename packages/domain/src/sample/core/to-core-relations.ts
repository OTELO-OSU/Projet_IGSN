import type { SampleParent } from "../parent/model.ts";
import type { Sample } from "../sample.ts";
import type { CoreRelation } from "./core-relation-schema.ts";

import { relationTargetHref } from "../relation/relation-target-href.ts";
import {
  CHILD_RELATION_TYPE,
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
  const toSampleRelation =
    (relationType: string) =>
    (related: SampleParent): CoreRelation => ({
      relationType,
      targetIdentifier: {
        value: related.igsn,
        identifierType: toParentIdentifierType(related.igsn),
      },
      targetURI: sampleLandingPage(related.igsn, frontendUrl),
      targetTitles: [{ value: related.name, titleType: "Main" }],
      targetResourceType: coreTargetResourceType.toCore("physical_object"),
    });
  relations.push(
    ...sample.parents.map(toSampleRelation(PARENT_RELATION_TYPE)),
    ...sample.children.map(toSampleRelation(CHILD_RELATION_TYPE)),
  );
  return relations.length === 0 ? undefined : relations;
}

import type { IdentifierType } from "@projet-igsn/domain/sample/relation/identifier-type";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  hasMetadataScheme,
  type RelationType,
} from "@projet-igsn/domain/sample/relation/relation-type";

export type RelationDraft = {
  key: string;
  relationType: RelationType | "";
  identifierType: IdentifierType;
  identifier: string;
  targetTitle: string;
  targetResourceType: RelationTargetResourceType | "";
  relatedMetadataScheme: string;
  schemeURI: string;
  schemeType: string;
  description: string;
};

export const EMPTY_RELATION_DRAFT: Omit<
  RelationDraft,
  "key" | "identifierType"
> = {
  relationType: "",
  identifier: "",
  targetTitle: "",
  targetResourceType: "",
  relatedMetadataScheme: "",
  schemeURI: "",
  schemeType: "",
  description: "",
};

export const toRelationDrafts = (
  relations: CreateSample["relations"],
): RelationDraft[] =>
  (relations ?? []).map((relation) => ({
    key: crypto.randomUUID(),
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier,
    targetTitle: relation.targetTitle ?? "",
    targetResourceType: relation.targetResourceType ?? "",
    relatedMetadataScheme: relation.relatedMetadataScheme ?? "",
    schemeURI: relation.schemeURI ?? "",
    schemeType: relation.schemeType ?? "",
    description: relation.description ?? "",
  }));

export const composeRelations = (relations: RelationDraft[]) =>
  relations.map((relation) => ({
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier.trim(),
    targetTitle: relation.targetTitle.trim() || null,
    targetResourceType: relation.targetResourceType || null,
    description: relation.description.trim() || null,
    ...(hasMetadataScheme(relation.relationType)
      ? {
          relatedMetadataScheme: relation.relatedMetadataScheme.trim() || null,
          schemeURI: relation.schemeURI.trim() || null,
          schemeType: relation.schemeType.trim() || null,
        }
      : {}),
  }));

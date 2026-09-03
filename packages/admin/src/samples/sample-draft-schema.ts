import type { IdentifierType } from "@projet-igsn/domain/sample/relation/identifier-type";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";

import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { publishedSampleSchema as domainPublishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  hasMetadataScheme,
  type RelationType,
} from "@projet-igsn/domain/sample/relation/relation-type";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import {
  type AgeFormValues,
  ageFormValues,
  toAgeInput,
} from "#/samples/age-form.ts";
import {
  composeCondition,
  type ConditionDraft,
  toConditionDraft,
} from "#/samples/compose-condition.ts";
import {
  composeDescription,
  type DescriptionDraft,
  toDescriptionDraft,
} from "#/samples/compose-description.ts";
import {
  composeEconomicInterest,
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "#/samples/compose-economic-interest.ts";
import {
  composeLocation,
  type LocationDraft,
  toLocationDraft,
} from "#/samples/compose-location.ts";
import {
  composeRepository,
  type RepositoryDraft,
  toRepositoryDraft,
} from "#/samples/compose-repository.ts";
import {
  composeScientificContext,
  type ScientificContextDraft,
  toScientificContextDraft,
} from "#/samples/compose-scientific-context.ts";
import {
  composeSecurity,
  type SecurityDraft,
  toSecurityDraft,
} from "#/samples/compose-security.ts";
import {
  composeSyntheticDetails,
  type SyntheticDetailsDraft,
  toSyntheticDetailsDraft,
} from "#/samples/compose-synthetic-details.ts";

export type RelationDraft = {
  key: string;
  relationType: RelationType | "";
  identifierType: IdentifierType | "";
  identifier: string;
  targetTitle: string;
  targetResourceType: RelationTargetResourceType | "";
  relationTypeInformation: string;
  relatedMetadataScheme: string;
  schemeURI: string;
  schemeType: string;
  description: string;
};

export const EMPTY_RELATION_DRAFT: Omit<RelationDraft, "key"> = {
  relationType: "",
  identifierType: "",
  identifier: "",
  targetTitle: "",
  targetResourceType: "",
  relationTypeInformation: "",
  relatedMetadataScheme: "",
  schemeURI: "",
  schemeType: "",
  description: "",
};

export type SampleDraft = {
  name: string | undefined;
  nature: CreateSample["nature"] | undefined;
  typePath: string[];
  materialPath: string[];
  texture: CreateSample["texture"] | undefined;
  metamorphicFacies: CreateSample["metamorphicFacies"] | undefined;
  collectionMethodPath: string[];
  collectionMethodDescription: string | null | undefined;
  specificName: string | null | undefined;
  geologicalContextDescription: string | null | undefined;
  geomorphologicalEnvironmentPath: string[];
  location: LocationDraft;
  description: DescriptionDraft;
  condition: ConditionDraft;
  security: SecurityDraft;
  scientificContext: ScientificContextDraft;
  repository: RepositoryDraft;
  syntheticDetails: SyntheticDetailsDraft;
  existenceStatus: CreateSample["existenceStatus"] | undefined;
  availabilityStatus: CreateSample["availabilityStatus"] | undefined;
  age: AgeFormValues;
  relations: RelationDraft[];
  manualGroupIds: string[];
} & EconomicInterestDraft;

export const toSampleDraft = (value?: CreateSample): SampleDraft => ({
  name: value?.name,
  nature: value?.nature,
  typePath: toHierarchyPath(value?.type ?? null),
  materialPath: toHierarchyPath(value?.material ?? null),
  texture: value?.texture,
  metamorphicFacies: value?.metamorphicFacies,
  collectionMethodPath: toHierarchyPath(value?.collectionMethod ?? null),
  collectionMethodDescription: value?.collectionMethodDescription,
  specificName: value?.specificName,
  geologicalContextDescription: value?.geologicalContextDescription,
  geomorphologicalEnvironmentPath: toHierarchyPath(
    value?.geomorphologicalEnvironment ?? null,
  ),
  location: toLocationDraft(value?.location),
  description: toDescriptionDraft(value?.description),
  condition: toConditionDraft(value?.condition),
  security: toSecurityDraft(value?.security),
  scientificContext: toScientificContextDraft(value?.scientificContext),
  repository: toRepositoryDraft(value?.repository),
  syntheticDetails: toSyntheticDetailsDraft(value?.syntheticDetails),
  existenceStatus: value?.existenceStatus ?? "exists",
  availabilityStatus: value?.availabilityStatus ?? "available",
  age: ageFormValues(value?.age),
  relations: (value?.relations ?? []).map((relation) => ({
    key: crypto.randomUUID(),
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier,
    targetTitle: relation.targetTitle,
    targetResourceType: relation.targetResourceType ?? "",
    relationTypeInformation: relation.relationTypeInformation ?? "",
    relatedMetadataScheme: relation.relatedMetadataScheme ?? "",
    schemeURI: relation.schemeURI ?? "",
    schemeType: relation.schemeType ?? "",
    description: relation.description ?? "",
  })),
  manualGroupIds: value?.manualGroupIds ?? [],
  ...toEconomicInterestDraft(value),
});

const composeRelations = (relations: RelationDraft[]) =>
  relations.map((relation) => ({
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier.trim(),
    targetTitle: relation.targetTitle.trim(),
    targetResourceType: relation.targetResourceType || null,
    relationTypeInformation: relation.relationTypeInformation.trim() || null,
    description: relation.description.trim() || null,
    ...(hasMetadataScheme(relation.relationType)
      ? {
          relatedMetadataScheme: relation.relatedMetadataScheme.trim() || null,
          schemeURI: relation.schemeURI.trim() || null,
          schemeType: relation.schemeType.trim() || null,
        }
      : {}),
  }));

const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
  const locationAllowed = allowsLocation(material);
  const description = composeDescription(draft.description);
  const condition = composeCondition(draft.condition);
  const age = toAgeInput(draft.age);
  const scientificContext = composeScientificContext(draft.scientificContext);
  const repository = composeRepository(draft.repository);
  const relations = composeRelations(draft.relations);
  const economic = composeEconomicInterest(draft, material);
  const syntheticDetails = composeSyntheticDetails(
    draft.syntheticDetails,
    material,
  );
  return {
    name: draft.name,
    nature: draft.nature,
    type: composeHierarchyValue(draft.typePath),
    material,
    ...(draft.texture ? { texture: draft.texture } : {}),
    ...(draft.metamorphicFacies
      ? { metamorphicFacies: draft.metamorphicFacies }
      : {}),
    collectionMethod: composeHierarchyValue(draft.collectionMethodPath),
    collectionMethodDescription:
      draft.collectionMethodDescription?.trim() || null,
    specificName: draft.specificName?.trim() || null,
    geologicalContextDescription: locationAllowed
      ? draft.geologicalContextDescription?.trim() || null
      : null,
    geomorphologicalEnvironment: locationAllowed
      ? composeHierarchyValue(draft.geomorphologicalEnvironmentPath)
      : null,
    location: locationAllowed ? composeLocation(draft.location) : null,
    ...(description ? { description } : {}),
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
    manualGroupIds: draft.manualGroupIds,
    ...economic,
  };
};

export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);

export const publishedSampleSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  domainPublishedSampleSchema,
);

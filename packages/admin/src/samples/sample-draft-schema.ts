import type { AdditionalRole } from "@projet-igsn/domain/sample/additional-role/role";
import type { DatePrecision } from "@projet-igsn/domain/sample/date-range";
import type { ProcessStepKind } from "@projet-igsn/domain/sample/process-step/kind";
import type { IdentifierType } from "@projet-igsn/domain/sample/relation/identifier-type";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";

import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { allowsSpecificName } from "@projet-igsn/domain/sample/material/allows-specific-name";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";
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
  composeDateRange,
  toDateRangeDraft,
} from "#/samples/compose-date-range.ts";
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
import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

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

export type AdditionalRoleDraft = {
  key: string;
  role: AdditionalRole;
  personUserId: string | null | undefined;
  personFirstname: string | null | undefined;
  personLastname: string | null | undefined;
};

export const EMPTY_ADDITIONAL_ROLE_DRAFT: Omit<
  AdditionalRoleDraft,
  "key" | "role"
> = {
  personUserId: undefined,
  personFirstname: undefined,
  personLastname: undefined,
};

export type ProcessStepDraft = {
  key: string;
  kind: ProcessStepKind;
  dateStart: string | undefined;
  dateEnd: string | undefined;
  datePrecision: DatePrecision;
  dateTimeZone: string | undefined;
  description: string;
};

export const EMPTY_PROCESS_STEP_DRAFT: Omit<ProcessStepDraft, "key" | "kind"> =
  {
    dateStart: undefined,
    dateEnd: undefined,
    datePrecision: "day",
    dateTimeZone: undefined,
    description: "",
  };

export type SampleDraft = {
  name: string | undefined;
  localId: string | null | undefined;
  localIdDescription: string | null | undefined;
  nature: CreateSample["nature"] | undefined;
  typePath: string[];
  materialPath: string[];
  texture: CreateSample["texture"] | undefined;
  metamorphicFacies: CreateSample["metamorphicFacies"] | undefined;
  metamorphicFabric: CreateSample["metamorphicFabric"] | undefined;
  collectionMethodPath: string[];
  collectionMethodDescription: string | null | undefined;
  specificName: string | null | undefined;
  geologicalContextDescription: string | null | undefined;
  physiographicEnvironmentPath: string[];
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
  processSteps: ProcessStepDraft[];
  manualGroupIds: string[];
  parentIds: string[];
} & EconomicInterestDraft;

export const toSampleDraft = (
  value?: Partial<CreateSample>,
  options: DraftOptions = {},
): SampleDraft => ({
  name: value?.name,
  localId: value?.localId,
  localIdDescription: value?.localIdDescription,
  nature: value?.nature,
  typePath: toHierarchyPath(value?.type ?? null),
  materialPath: toHierarchyPath(
    value?.material ?? draftDefault<string | null>(options, MATERIAL_ROOTS[0]),
  ),
  texture: value?.texture,
  metamorphicFacies: value?.metamorphicFacies,
  metamorphicFabric: value?.metamorphicFabric,
  collectionMethodPath: toHierarchyPath(value?.collectionMethod ?? null),
  collectionMethodDescription: value?.collectionMethodDescription,
  specificName: value?.specificName,
  geologicalContextDescription: value?.geologicalContextDescription,
  physiographicEnvironmentPath: toHierarchyPath(
    value?.physiographicEnvironment ?? null,
  ),
  location: toLocationDraft(value?.location),
  description: toDescriptionDraft(value?.description, options),
  condition: toConditionDraft(value?.condition),
  security: toSecurityDraft(value?.security, options),
  scientificContext: toScientificContextDraft(
    value?.scientificContext,
    options,
  ),
  repository: toRepositoryDraft(value?.repository),
  syntheticDetails: toSyntheticDetailsDraft(value?.syntheticDetails, options),
  existenceStatus: value?.existenceStatus ?? draftDefault(options, "exists"),
  availabilityStatus:
    value?.availabilityStatus ?? draftDefault(options, "available"),
  age: ageFormValues(value?.age),
  relations: (value?.relations ?? []).map((relation) => ({
    key: crypto.randomUUID(),
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier,
    targetTitle: relation.targetTitle,
    targetResourceType: relation.targetResourceType ?? "",
    relatedMetadataScheme: relation.relatedMetadataScheme ?? "",
    schemeURI: relation.schemeURI ?? "",
    schemeType: relation.schemeType ?? "",
    description: relation.description ?? "",
  })),
  processSteps: (value?.processSteps ?? []).map((step) => {
    const date = toDateRangeDraft(step.date, options);
    return {
      key: crypto.randomUUID(),
      kind: step.kind,
      dateStart: date.start,
      dateEnd: date.end,
      datePrecision: date.precision,
      dateTimeZone: date.timeZone,
      description: step.description ?? "",
    };
  }),
  manualGroupIds: value?.manualGroupIds ?? [],
  parentIds: value?.parentIds ?? [],
  ...toEconomicInterestDraft(value),
});

const composeRelations = (relations: RelationDraft[]) =>
  relations.map((relation) => ({
    relationType: relation.relationType,
    identifierType: relation.identifierType,
    identifier: relation.identifier.trim(),
    targetTitle: relation.targetTitle.trim(),
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

export const composeProcessSteps = (steps: ProcessStepDraft[]) =>
  steps.map((step) => ({
    kind: step.kind,
    date: composeDateRange({
      start: step.dateStart,
      end: step.dateEnd,
      precision: step.datePrecision,
      timeZone: step.dateTimeZone,
    }),
    description: step.description.trim() || undefined,
  }));

const composeCreateSample = (draft: SampleDraft) => {
  const material = composeHierarchyValue(draft.materialPath);
  const locationAllowed = allowsLocation(material);
  const condition = composeCondition(draft.condition);
  const age = toAgeInput(draft.age);
  const scientificContext = composeScientificContext(draft.scientificContext);
  const repository = composeRepository(draft.repository);
  const relations = composeRelations(draft.relations);
  const processSteps = composeProcessSteps(draft.processSteps);
  const economic = composeEconomicInterest(draft, material);
  const syntheticDetails = composeSyntheticDetails(
    draft.syntheticDetails,
    material,
  );
  const localId = draft.localId?.trim() || null;
  return {
    name: draft.name,
    localId,
    ...(localId
      ? { localIdDescription: draft.localIdDescription?.trim() || null }
      : {}),
    nature: draft.nature ?? null,
    type: composeHierarchyValue(draft.typePath),
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
    location: locationAllowed ? composeLocation(draft.location) : null,
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
    manualGroupIds: draft.manualGroupIds,
    ...(draft.parentIds.length > 0 ? { parentIds: draft.parentIds } : {}),
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

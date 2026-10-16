import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
import { DEFAULT_AVAILABILITY_STATUS } from "@projet-igsn/domain/sample/curation/availability-status";
import { DEFAULT_EXISTENCE_STATUS } from "@projet-igsn/domain/sample/curation/existence-status";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";
import { publishedEditSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import { type AgeFormValues, ageFormValues } from "#/samples/age-form.ts";
import {
  type ConditionDraft,
  toConditionDraft,
} from "#/samples/compose-condition.ts";
import { composeCreateSample } from "#/samples/compose-create-sample.ts";
import {
  type DescriptionDraft,
  toDescriptionDraft,
} from "#/samples/compose-description.ts";
import {
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "#/samples/compose-economic-interest.ts";
import {
  type LocationDraft,
  toLocationDraft,
} from "#/samples/compose-location.ts";
import {
  type MineralClassificationDraft,
  toMineralClassificationDrafts,
} from "#/samples/compose-mineral-classifications.ts";
import {
  type ProcessStepDraft,
  toProcessStepDrafts,
} from "#/samples/compose-process-steps.ts";
import {
  type RelationDraft,
  toRelationDrafts,
} from "#/samples/compose-relations.ts";
import {
  type RepositoryDraft,
  toRepositoryDraft,
} from "#/samples/compose-repository.ts";
import {
  type ScientificContextDraft,
  toScientificContextDraft,
} from "#/samples/compose-scientific-context.ts";
import {
  type SecurityDraft,
  toSecurityDraft,
} from "#/samples/compose-security.ts";
import {
  type SyntheticDetailsDraft,
  toSyntheticDetailsDraft,
} from "#/samples/compose-synthetic-details.ts";
import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

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
  mineralClassifications: MineralClassificationDraft[];
  manualGroupIds: string[];
  parentIds: string[];
  childIds: string[];
  seriesId: string | null;
} & EconomicInterestDraft;

export type SampleDraftSource = Partial<CreateSample> & {
  parents?: readonly Pick<SampleParent, "id">[];
};

export const toSampleDraft = (
  value?: SampleDraftSource,
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
  existenceStatus:
    value?.existenceStatus ?? draftDefault(options, DEFAULT_EXISTENCE_STATUS),
  availabilityStatus:
    value?.availabilityStatus ??
    draftDefault(options, DEFAULT_AVAILABILITY_STATUS),
  age: ageFormValues(value?.age),
  relations: toRelationDrafts(value?.relations),
  processSteps: toProcessStepDrafts(value?.processSteps, options),
  mineralClassifications: toMineralClassificationDrafts(
    value?.mineralClassifications,
  ),
  manualGroupIds: value?.manualGroupIds ?? [],
  parentIds: value?.parentIds ?? value?.parents?.map(({ id }) => id) ?? [],
  childIds: value?.childIds ?? [],
  seriesId: value?.seriesId ?? null,
  ...toEconomicInterestDraft(value),
});

export const sampleDraftSchema = z.preprocess(
  (draft) => composeCreateSample(draft as SampleDraft),
  createSampleSchema,
);

export const publishedEditDraftSchema = (
  existing: readonly PublishBlocker[],
): typeof sampleDraftSchema =>
  z.preprocess(
    (draft) => composeCreateSample(draft as SampleDraft),
    publishedEditSchema(existing),
  );

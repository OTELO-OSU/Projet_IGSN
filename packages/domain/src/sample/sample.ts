import { z } from "zod";

import { igsnSchema } from "../igsn/model.ts";
import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { manualGroupSchema } from "../manual-group/model.ts";
import { userSchema } from "../user/model.ts";
import { ageSchema } from "./age/model.ts";
import { updateSampleAttachmentSchema } from "./attachment/attachment-validator.ts";
import { sampleAttachmentSchema } from "./attachment/model.ts";
import { collectionMethodSchema } from "./collection-method/vocabulary.ts";
import { conditionSchema } from "./condition/model.ts";
import { allowedAvailabilityStatuses } from "./curation/allowed-availability-statuses.ts";
import { availabilityStatusSchema } from "./curation/availability-status.ts";
import { existenceStatusSchema } from "./curation/existence-status.ts";
import { descriptionSchema } from "./description/model.ts";
import { elementSchema } from "./element/vocabulary.ts";
import { freeTextSchema } from "./free-text.ts";
import { geomorphologicalEnvironmentSchema } from "./geomorphological-environment/vocabulary.ts";
import { allowsLocation } from "./location/allows-location.ts";
import { locationSchema } from "./location/model.ts";
import { allowsSpecificName } from "./material/allows-specific-name.ts";
import { materialPathSchema } from "./material/classification.ts";
import { isOtherMaterial } from "./material/is-other-material.ts";
import {
  fabricsFor,
  metamorphicFabricSchema,
} from "./metamorphic-fabric/vocabulary.ts";
import {
  faciesFor,
  metamorphicFaciesSchema,
} from "./metamorphic-facies/vocabulary.ts";
import { natureSchema } from "./nature.ts";
import { sampleParentSchema } from "./parent/model.ts";
import { sampleProcessStepSchema } from "./process-step/model.ts";
import {
  createSampleRelationSchema,
  sampleRelationSchema,
} from "./relation/model.ts";
import { repositorySchema } from "./repository/model.ts";
import { resourceTypeSchema } from "./resource-type/vocabulary.ts";
import {
  createScientificContextSchema,
  scientificContextSchema,
} from "./scientific-context/model.ts";
import { securitySchema } from "./security/model.ts";
import { isSyntheticMaterial } from "./synthetic-details/is-synthetic-material.ts";
import {
  createSyntheticDetailsSchema,
  syntheticDetailsSchema,
} from "./synthetic-details/model.ts";
import { textureSchema, texturesFor } from "./texture/vocabulary.ts";
import { sampleTypeSchema } from "./type/vocabulary.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleStatusSchema = z.enum([
  "draft",
  "published",
  "withdrawn",
  "tombstone",
]);

export type SampleStatus = z.infer<typeof sampleStatusSchema>;

export const publicationYearSchema = z.number().int().positive();

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema.nullable(),
  type: sampleTypeSchema.nullable(),
  material: materialPathSchema.nullable(),
  materialOtherName: nameSchema.nullable(),
  texture: textureSchema.nullable(),
  metamorphicFacies: metamorphicFaciesSchema.nullable(),
  metamorphicFabric: metamorphicFabricSchema.nullable(),
  collectionMethod: collectionMethodSchema.nullable(),
  collectionMethodDescription: nameSchema.nullable(),
  specificName: nameSchema.nullable(),
  location: locationSchema.nullable(),
  description: descriptionSchema.nullable(),
  condition: conditionSchema.nullable(),
  repository: repositorySchema.nullable().default(null),
  geologicalContextDescription: freeTextSchema.nullable().default(null),
  geomorphologicalEnvironment: geomorphologicalEnvironmentSchema
    .nullable()
    .default(null),
  scientificContext: scientificContextSchema.nullable().default(null),
  syntheticDetails: syntheticDetailsSchema.nullable().default(null),
  age: ageSchema.nullable().default(null),
  relations: z.array(sampleRelationSchema).default([]),
  processSteps: z.array(sampleProcessStepSchema).default([]),
  attachments: z.array(sampleAttachmentSchema).default([]),
  security: securitySchema.nullable(),
  existenceStatus: existenceStatusSchema.nullable(),
  availabilityStatus: availabilityStatusSchema.nullable(),
  publicationYear: publicationYearSchema.nullable(),
  resourceType: resourceTypeSchema.nullable(),
  economicInterestElements: z.array(elementSchema).default([]),
  economicResourceTypePrecision: nameSchema.nullable(),
  economicDepositName: nameSchema.nullable(),
  economicDepositDescription: nameSchema.nullable(),
  igsn: igsnSchema.nullable(),
  doiPrefix: z.string().nullable(),
  owner: userSchema
    .pick({ name: true, firstname: true })
    .nullable()
    .default(null),
  manualGroups: z.array(manualGroupSchema).default([]),
  parents: z.array(sampleParentSchema).default([]),
  // ponytail: snapshot of the owner's groups at creation, never edited afterwards, so it stays out of createSampleSchema
  ...institutionalGroupsFields,
  status: sampleStatusSchema,
  createdAt: z.coerce.date(),
  publishedAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date(),
});

export type Sample = z.infer<typeof sampleSchema>;

export const MAX_SAMPLE_PARENTS = 2;

const createSampleFieldsSchema = z.strictObject({
  name: nameSchema,
  nature: natureSchema.nullable().default(null),
  type: sampleTypeSchema.nullable().default(null),
  material: materialPathSchema.nullish(),
  materialOtherName: nameSchema.nullish(),
  texture: textureSchema.nullish(),
  metamorphicFacies: metamorphicFaciesSchema.nullish(),
  metamorphicFabric: metamorphicFabricSchema.nullish(),
  collectionMethod: collectionMethodSchema.nullish(),
  collectionMethodDescription: nameSchema.nullish(),
  specificName: nameSchema.nullish(),
  location: locationSchema.nullish(),
  description: descriptionSchema.nullish(),
  condition: conditionSchema.nullish(),
  repository: repositorySchema.nullish(),
  geologicalContextDescription: freeTextSchema.nullish(),
  geomorphologicalEnvironment: geomorphologicalEnvironmentSchema.nullish(),
  scientificContext: createScientificContextSchema.nullish(),
  syntheticDetails: createSyntheticDetailsSchema.nullish(),
  age: ageSchema.nullish(),
  relations: z.array(createSampleRelationSchema).optional(),
  processSteps: z.array(sampleProcessStepSchema).optional(),
  attachments: z.array(updateSampleAttachmentSchema).optional(),
  security: securitySchema.nullish(),
  existenceStatus: existenceStatusSchema.nullish(),
  availabilityStatus: availabilityStatusSchema.nullish(),
  resourceType: resourceTypeSchema.nullish(),
  economicInterestElements: z.array(elementSchema).optional(),
  economicResourceTypePrecision: nameSchema.nullish(),
  economicDepositName: nameSchema.nullish(),
  economicDepositDescription: nameSchema.nullish(),
  manualGroupIds: z.array(z.uuid()).optional(),
  parentIds: z.array(z.uuid()).max(MAX_SAMPLE_PARENTS).optional(),
});

type SampleCheck = Omit<
  z.infer<typeof createSampleFieldsSchema>,
  "parentIds"
> & { parentIds?: string[] };

const checkSample = (value: SampleCheck, ctx: z.RefinementCtx) => {
  if (
    value.texture != null &&
    !texturesFor(value.material ?? null).includes(value.texture)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["texture"],
      message: "texture is not valid for the selected material",
    });
  }
  if (value.materialOtherName != null && !isOtherMaterial(value.material)) {
    ctx.addIssue({
      code: "custom",
      path: ["materialOtherName"],
      message: "only the other material carries a free-text name",
    });
  }
  if (value.specificName != null && !allowsSpecificName(value.material)) {
    ctx.addIssue({
      code: "custom",
      path: ["specificName"],
      message: "an unknown rock carries no specific name",
    });
  }
  if (
    value.metamorphicFacies != null &&
    !faciesFor(value.material ?? null).includes(value.metamorphicFacies)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["metamorphicFacies"],
      message: "metamorphic facies is not valid for the selected material",
    });
  }
  if (
    value.metamorphicFabric != null &&
    !fabricsFor(value.material ?? null).includes(value.metamorphicFabric)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["metamorphicFabric"],
      message: "metamorphic fabric is not valid for the selected material",
    });
  }
  if (
    value.availabilityStatus != null &&
    !allowedAvailabilityStatuses(value.existenceStatus).includes(
      value.availabilityStatus,
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["availabilityStatus"],
      message: "availability status is not valid for the existence status",
    });
  }
  if (!allowsLocation(value.material ?? null)) {
    for (const field of [
      "location",
      "geologicalContextDescription",
      "geomorphologicalEnvironment",
    ] as const) {
      if (value[field] != null) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `a synthetic or returned extraterrestrial sample must not have a ${field}`,
        });
      }
    }
  }
  if (
    value.parentIds != null &&
    new Set(value.parentIds).size !== value.parentIds.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["parentIds"],
      message: "a parent is listed twice",
    });
  }
  if (
    (value.parentIds?.length ?? 0) > 1 &&
    !isSyntheticMaterial(value.material ?? null)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["material"],
      message: "a sample with two parents must be synthetic",
    });
  }
  if (
    value.syntheticDetails != null &&
    !isSyntheticMaterial(value.material ?? null)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["syntheticDetails"],
      message: "only a synthetic sample carries synthesis details",
    });
  }
};

export const createSampleSchema =
  createSampleFieldsSchema.superRefine(checkSample);

export type CreateSample = z.infer<typeof createSampleSchema>;

export const updateSampleSchema = createSampleFieldsSchema
  .omit({ parentIds: true })
  .superRefine(checkSample);

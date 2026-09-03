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
import { materialPathSchema } from "./material/classification.ts";
import {
  faciesFor,
  metamorphicFaciesSchema,
} from "./metamorphic-facies/vocabulary.ts";
import { natureSchema } from "./nature.ts";
import {
  createSampleRelationSchema,
  sampleRelationSchema,
} from "./relation/model.ts";
import { repositorySchema } from "./repository/model.ts";
import { resourceTypeSchema } from "./resource-type/vocabulary.ts";
import { scientificContextSchema } from "./scientific-context/model.ts";
import { securitySchema } from "./security/model.ts";
import { isSyntheticMaterial } from "./synthetic-details/is-synthetic-material.ts";
import { syntheticDetailsSchema } from "./synthetic-details/model.ts";
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

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema,
  type: sampleTypeSchema.nullable(),
  material: materialPathSchema.nullable(),
  texture: textureSchema.nullable(),
  metamorphicFacies: metamorphicFaciesSchema.nullable(),
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
  attachments: z.array(sampleAttachmentSchema).default([]),
  security: securitySchema.nullable(),
  existenceStatus: existenceStatusSchema.nullable(),
  availabilityStatus: availabilityStatusSchema.nullable(),
  publicationYear: z.number().int().positive().nullable(),
  resourceType: resourceTypeSchema.nullable(),
  economicInterestElements: z.array(elementSchema).default([]),
  economicResourceTypePrecision: nameSchema.nullable(),
  economicDepositName: nameSchema.nullable(),
  economicDepositDescription: nameSchema.nullable(),
  igsn: igsnSchema.nullable(),
  owner: userSchema
    .pick({ name: true, firstname: true })
    .nullable()
    .default(null),
  manualGroups: z.array(manualGroupSchema).default([]),
  // ponytail: snapshot of the owner's groups at creation, never edited afterwards, so it stays out of createSampleSchema
  ...institutionalGroupsFields,
  status: sampleStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Sample = z.infer<typeof sampleSchema>;

export const createSampleSchema = z
  .strictObject({
    name: nameSchema,
    nature: natureSchema,
    type: sampleTypeSchema.nullable().default(null),
    material: materialPathSchema.nullish(),
    texture: textureSchema.nullish(),
    metamorphicFacies: metamorphicFaciesSchema.nullish(),
    collectionMethod: collectionMethodSchema.nullish(),
    collectionMethodDescription: nameSchema.nullish(),
    specificName: nameSchema.nullish(),
    location: locationSchema.nullish(),
    description: descriptionSchema.nullish(),
    condition: conditionSchema.nullish(),
    repository: repositorySchema.nullish(),
    geologicalContextDescription: freeTextSchema.nullish(),
    geomorphologicalEnvironment: geomorphologicalEnvironmentSchema.nullish(),
    scientificContext: scientificContextSchema.nullish(),
    syntheticDetails: syntheticDetailsSchema.nullish(),
    age: ageSchema.nullish(),
    relations: z.array(createSampleRelationSchema).optional(),
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
  })
  .superRefine((value, ctx) => {
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
      value.syntheticDetails != null &&
      !isSyntheticMaterial(value.material ?? null)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["syntheticDetails"],
        message: "only a synthetic sample carries synthesis details",
      });
    }
  });

export type CreateSample = z.infer<typeof createSampleSchema>;

import { z } from "zod";

import { igsnSchema } from "../igsn/model.ts";
import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { manualGroupSchema } from "../manual-group/model.ts";
import { userSchema } from "../user/model.ts";
import { ageSchema } from "./age/model.ts";
import { updateSampleAttachmentSchema } from "./attachment/attachment-validator.ts";
import { sampleAttachmentSchema } from "./attachment/model.ts";
import { availabilitySchema } from "./availability/availability.ts";
import { collectionMethodSchema } from "./collection-method/vocabulary.ts";
import { conditionSchema } from "./condition/model.ts";
import { descriptionSchema } from "./description/model.ts";
import { economicInterestSchema } from "./economic-interest/vocabulary.ts";
import { elementSchema } from "./element/vocabulary.ts";
import { createSampleLinkSchema, sampleLinkSchema } from "./link/model.ts";
import { locationRequirement } from "./location/location-requirement.ts";
import { locationSchema } from "./location/model.ts";
import { materialPathSchema } from "./material/classification.ts";
import {
  faciesFor,
  metamorphicFaciesSchema,
} from "./metamorphic-facies/vocabulary.ts";
import { natureSchema } from "./nature.ts";
import { scientificContextSchema } from "./scientific-context/model.ts";
import { securitySchema } from "./security/model.ts";
import { textureSchema, texturesFor } from "./texture/vocabulary.ts";
import { sampleTypeSchema } from "./type/vocabulary.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleStatusSchema = z.enum(["draft", "published", "withdrawn"]);

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
  scientificContext: scientificContextSchema.nullable().default(null),
  age: ageSchema.nullable().default(null),
  links: z.array(sampleLinkSchema).default([]),
  attachments: z.array(sampleAttachmentSchema).default([]),
  security: securitySchema.nullable(),
  availability: availabilitySchema.nullable(),
  publicationYear: z.number().int().positive().nullable(),
  economicInterest: economicInterestSchema.nullable(),
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
    scientificContext: scientificContextSchema.nullish(),
    age: ageSchema.nullish(),
    links: z.array(createSampleLinkSchema).optional(),
    attachments: z.array(updateSampleAttachmentSchema).optional(),
    security: securitySchema.nullish(),
    availability: availabilitySchema.nullish(),
    economicInterest: economicInterestSchema.nullish(),
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
      value.location != null &&
      locationRequirement(value.material ?? null) === "forbidden"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["location"],
        message: "a synthetic sample must not have a location",
      });
    }
  });

export type CreateSample = z.infer<typeof createSampleSchema>;

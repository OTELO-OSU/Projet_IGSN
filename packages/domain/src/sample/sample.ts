import { z } from "zod";

import { igsnSuffixSchema } from "../igsn/model.ts";
import { ageSchema } from "./age/model.ts";
import { sampleAttachmentSchema } from "./attachment/model.ts";
import { collectionMethodSchema } from "./collection-method/vocabulary.ts";
import { conditionSchema } from "./condition/model.ts";
import { descriptionSchema } from "./description/model.ts";
import { createSampleLinkSchema, sampleLinkSchema } from "./link/model.ts";
import { locationRequirement } from "./location/location-requirement.ts";
import { locationSchema } from "./location/model.ts";
import { materialPathSchema } from "./material/classification.ts";
import {
  faciesFor,
  metamorphicFaciesSchema,
} from "./metamorphic-facies/vocabulary.ts";
import { natureSchema } from "./nature.ts";
import { textureSchema, texturesFor } from "./texture/vocabulary.ts";
import { sampleTypeSchema } from "./type/vocabulary.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema,
  // Null until the sample is classified.
  type: sampleTypeSchema.nullable(),
  material: materialPathSchema.nullable(),
  // Igneous texture; only set for a plutonic/volcanic material (see texturesFor),
  // null otherwise. Not part of the material tree.
  texture: textureSchema.nullable(),
  // Metamorphic facies; only set for a metamorphic material (see faciesFor),
  // null otherwise. Not part of the material tree, but required to publish a
  // metamorphic sample (see sample-publish-blockers).
  metamorphicFacies: metamorphicFaciesSchema.nullable(),
  // Null until the collection method is recorded.
  collectionMethod: collectionMethodSchema.nullable(),
  // Free-text detail on the collection method; optional, null when not provided.
  collectionMethodDescription: nameSchema.nullable(),
  // Precise sample designation; optional, null when not provided.
  specificName: nameSchema.nullable(),
  // Geographic location; null when the sample has none (see location/model.ts).
  location: locationSchema.nullable(),
  // Physical description; null when the sample has none (see description/model.ts).
  description: descriptionSchema.nullable(),
  // Storage/conditioning state; null when the sample has none (see condition/model.ts).
  condition: conditionSchema.nullable(),
  // Geological age; null until recorded (flat columns on the sample table).
  // Defaulted so a payload without the key reads as "no age recorded".
  age: ageSchema.nullable().default(null),
  // Related DOI links and attached files (ADR 0017); empty arrays when none.
  // Defaulted so payloads predating the feature keep parsing.
  links: z.array(sampleLinkSchema).default([]),
  attachments: z.array(sampleAttachmentSchema).default([]),
  // Null until the sample is published.
  igsn: igsnSuffixSchema.nullable(),
  published: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Sample = z.infer<typeof sampleSchema>;

// material is optional at creation: a draft can be saved before it is
// classified (omitted or null). It becomes mandatory, and must reach a leaf,
// only at publish (see isSamplePublishable).
export const createSampleSchema = z
  .strictObject({
    name: nameSchema,
    nature: natureSchema,
    type: sampleTypeSchema.nullable().default(null),
    material: materialPathSchema.nullish(),
    // Optional; valid only for the material's igneous branch (see texturesFor).
    texture: textureSchema.nullish(),
    // Optional at creation; valid only for a metamorphic material (see faciesFor).
    // Required only at publish, not at creation (like material).
    metamorphicFacies: metamorphicFaciesSchema.nullish(),
    // Optional at creation, like material: omitted or null on a draft.
    collectionMethod: collectionMethodSchema.nullish(),
    collectionMethodDescription: nameSchema.nullish(),
    specificName: nameSchema.nullish(),
    location: locationSchema.nullish(),
    // Optional at creation; its collection date is required only at publish
    // (see sample-publish-blockers).
    description: descriptionSchema.nullish(),
    // Optional at creation and at publication (no publish blocker).
    condition: conditionSchema.nullish(),
    age: ageSchema.nullish(),
    // Related DOI links, replaced wholesale on update. Attachments are not
    // part of this payload: their content uploads through dedicated routes.
    links: z.array(createSampleLinkSchema).optional(),
  })
  .superRefine((value, ctx) => {
    // A texture must match the selected material's branch. This guards the
    // "texture resets when the material changes" invariant server-side.
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
    // Synthetic material derives its location from the structure ROR (ADR 0014).
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
  })
  // A facies is only valid when the material is metamorphic. Guards the
  // "facies resets when the material changes" invariant server-side.
  .superRefine((value, ctx) => {
    if (value.metamorphicFacies == null) return;
    if (!faciesFor(value.material ?? null).includes(value.metamorphicFacies)) {
      ctx.addIssue({
        code: "custom",
        path: ["metamorphicFacies"],
        message: "metamorphic facies is not valid for the selected material",
      });
    }
  });

export type CreateSample = z.infer<typeof createSampleSchema>;

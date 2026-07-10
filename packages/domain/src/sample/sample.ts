import { z } from "zod";

import { igsnSuffixSchema } from "../igsn/model.ts";
import { collectionMethodSchema } from "./collection-method/vocabulary.ts";
import { materialPathSchema } from "./material/classification.ts";
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
  // Null until the collection method is recorded.
  collectionMethod: collectionMethodSchema.nullable(),
  // Precise sample designation; optional, null when not provided.
  specificName: nameSchema.nullable(),
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
    // Optional at creation, like material: omitted or null on a draft.
    collectionMethod: collectionMethodSchema.nullish(),
    specificName: nameSchema.nullish(),
  })
  // A texture must match the selected material's branch. This guards the
  // "texture resets when the material changes" invariant server-side.
  .superRefine((value, ctx) => {
    if (value.texture == null) return;
    if (!texturesFor(value.material ?? null).includes(value.texture)) {
      ctx.addIssue({
        code: "custom",
        path: ["texture"],
        message: "texture is not valid for the selected material",
      });
    }
  });

export type CreateSample = z.infer<typeof createSampleSchema>;

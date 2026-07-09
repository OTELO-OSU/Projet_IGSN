import { z } from "zod";

import { igsnSuffixSchema } from "../igsn/model.ts";
import { collectionMethodSchema } from "./collection-method.ts";
import { materialPathSchema } from "./material.ts";
import { natureSchema } from "./nature.ts";
import { sampleTypeSchema } from "./type.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema,
  // Null until the sample is classified.
  type: sampleTypeSchema.nullable(),
  // Hierarchical classification path; null until the sample is classified.
  material: materialPathSchema.nullable(),
  // Null until the collection method is recorded.
  collectionMethod: collectionMethodSchema.nullable(),
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
export const createSampleSchema = z.strictObject({
  name: nameSchema,
  nature: natureSchema,
  type: sampleTypeSchema.nullable().default(null),
  material: materialPathSchema.nullish(),
  // Optional at creation, like material: omitted or null on a draft.
  collectionMethod: collectionMethodSchema.nullish(),
});

export type CreateSample = z.infer<typeof createSampleSchema>;

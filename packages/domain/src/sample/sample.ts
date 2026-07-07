import { z } from "zod";

import { igsnSuffixSchema } from "../igsn/model.ts";
import { natureSchema } from "./nature.ts";
import { sampleTypeSchema } from "./type.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema,
  // Null until the sample is classified.
  type: sampleTypeSchema.nullable(),
  // Null until the sample is published.
  igsn: igsnSuffixSchema.nullable(),
  published: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Sample = z.infer<typeof sampleSchema>;

export const createSampleSchema = z.strictObject({
  name: nameSchema,
  nature: natureSchema,
  type: sampleTypeSchema.nullable().default(null),
});

export type CreateSample = z.infer<typeof createSampleSchema>;

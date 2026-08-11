import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";

// Links on a sample are always DOIs, in their canonical https://doi.org form
// (a DOI name is `10.<registrant>/<suffix>`).
export const doiUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/doi\.org\/10\.\d{4,9}\/\S+$/, "must be a DOI url");

export const sampleLinkSchema = z.object({
  id: z.uuid(),
  url: doiUrlSchema,
  description: freeTextSchema.nullable(),
});

export type SampleLink = z.infer<typeof sampleLinkSchema>;

export const createSampleLinkSchema = z.strictObject({
  url: doiUrlSchema,
  description: freeTextSchema.nullish(),
});

export type CreateSampleLink = z.infer<typeof createSampleLinkSchema>;

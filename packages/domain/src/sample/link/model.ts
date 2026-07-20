import { z } from "zod";

// Same seam as description/model.ts: sample.ts imports this module, so
// nameSchema cannot be imported from sample.ts.
const freeText = z.string().trim().min(1);

// Links on a sample are always DOIs, in their canonical https://doi.org form
// (a DOI name is `10.<registrant>/<suffix>`).
export const doiUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/doi\.org\/10\.\d{4,9}\/\S+$/, "must be a DOI url");

export const sampleLinkSchema = z.object({
  id: z.uuid(),
  url: doiUrlSchema,
  description: freeText.nullable(),
});

export type SampleLink = z.infer<typeof sampleLinkSchema>;

// A description never comes without its url; a url alone is fine.
export const createSampleLinkSchema = z.strictObject({
  url: doiUrlSchema,
  description: freeText.nullish(),
});

export type CreateSampleLink = z.infer<typeof createSampleLinkSchema>;

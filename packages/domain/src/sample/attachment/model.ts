import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";

// The file content itself lives in blob storage keyed by the attachment id
// (ADR 0017), never in the model.
export const sampleAttachmentSchema = z.object({
  id: z.uuid(),
  name: freeTextSchema,
  mediaType: freeTextSchema,
  description: freeTextSchema.nullable(),
});

export type SampleAttachment = z.infer<typeof sampleAttachmentSchema>;

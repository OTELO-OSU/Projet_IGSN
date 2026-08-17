import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";

export const sampleAttachmentSchema = z.object({
  id: z.uuid(),
  name: freeTextSchema,
  mediaType: freeTextSchema,
  description: freeTextSchema.nullable(),
});

export type SampleAttachment = z.infer<typeof sampleAttachmentSchema>;

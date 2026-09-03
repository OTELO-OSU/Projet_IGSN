import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { relationTargetResourceTypeSchema } from "../relation/target-resource-type.ts";

export const sampleAttachmentSchema = z.object({
  id: z.uuid(),
  name: freeTextSchema,
  mediaType: freeTextSchema,
  title: freeTextSchema.nullable(),
  targetResourceType: relationTargetResourceTypeSchema.nullable(),
  description: freeTextSchema.nullable(),
});

export type SampleAttachment = z.infer<typeof sampleAttachmentSchema>;

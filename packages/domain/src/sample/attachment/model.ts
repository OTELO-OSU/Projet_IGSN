import { z } from "zod";

// Same seam as description/model.ts: sample.ts imports this module, so
// nameSchema cannot be imported from sample.ts.
const freeText = z.string().trim().min(1);

// Metadata of a file attached to a sample. The file content itself lives in
// blob storage keyed by the attachment id (ADR 0017), never in the model.
export const sampleAttachmentSchema = z.object({
  id: z.uuid(),
  // Original file name, kept for the download.
  name: freeText,
  mediaType: freeText,
  sizeBytes: z.number().int().positive(),
  description: freeText.nullable(),
});

export type SampleAttachment = z.infer<typeof sampleAttachmentSchema>;

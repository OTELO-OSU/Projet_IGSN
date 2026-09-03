import { z } from "zod";

import { relationTargetResourceTypeSchema } from "../relation/target-resource-type.ts";

// ponytail: 100 MB keeps the api's buffered upload safe; raising it further
// means streaming the multipart body instead.
export const ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;

export const DEFAULT_UPLOAD_LIMIT = 5;

// Any file type is accepted (documents, scans, photos, video...).
export const uploadSampleAttachmentSchema = z.strictObject({
  file: z.file().max(ATTACHMENT_MAX_BYTES),
  title: z.string().trim().min(1).optional(),
  targetResourceType: relationTargetResourceTypeSchema.optional(),
  description: z.string().trim().min(1).optional(),
});

export type UploadSampleAttachment = z.infer<
  typeof uploadSampleAttachmentSchema
>;

export const updateSampleAttachmentSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().trim().min(1).nullable(),
  targetResourceType: relationTargetResourceTypeSchema.nullable(),
  description: z.string().trim().min(1).nullable(),
});

export type UpdateSampleAttachment = z.infer<
  typeof updateSampleAttachmentSchema
>;

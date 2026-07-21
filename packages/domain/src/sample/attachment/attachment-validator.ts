import { z } from "zod";

// ponytail: 100 MB keeps the api's buffered upload safe; raising it further
// means streaming the multipart body instead.
export const ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;

// Upload input, shared by the api multipart validation and the admin form.
// Any file type is accepted (documents, scans, photos, video...); downloads
// are always attachment + nosniff, so nothing executes in the browser.
// A description never comes without its file; a file alone is fine.
export const uploadSampleAttachmentSchema = z.strictObject({
  file: z.file().max(ATTACHMENT_MAX_BYTES),
  description: z.string().trim().min(1).optional(),
});

export type UploadSampleAttachment = z.infer<
  typeof uploadSampleAttachmentSchema
>;

// Attachment metadata carried by the sample update payload: the id of an
// already-uploaded attachment and its description. Content never travels
// here; it uploads through the dedicated attachment route first, and the
// payload then references the returned id.
export const updateSampleAttachmentSchema = z.strictObject({
  id: z.uuid(),
  description: z.string().trim().min(1).nullable(),
});

export type UpdateSampleAttachment = z.infer<
  typeof updateSampleAttachmentSchema
>;

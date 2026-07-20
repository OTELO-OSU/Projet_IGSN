import { z } from "zod";

// ponytail: fixed cap; make it configurable if a real file ever needs more.
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

// Allow-list from the sample-link spec (documents, tabular data, images);
// extend as new needs surface.
export const ATTACHMENT_EXTENSIONS = [
  "pdf",
  "csv",
  "xls",
  "xlsx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "svg",
] as const;

export function hasAllowedAttachmentExtension(name: string): boolean {
  const extension = name.split(".").pop();
  return (
    name.includes(".") &&
    extension !== undefined &&
    (ATTACHMENT_EXTENSIONS as readonly string[]).includes(
      extension.toLowerCase(),
    )
  );
}

// Upload input, shared by the api multipart validation and the admin form.
// A description never comes without its file; a file alone is fine.
export const uploadSampleAttachmentSchema = z.strictObject({
  file: z
    .file()
    .max(ATTACHMENT_MAX_BYTES)
    .refine((file) => hasAllowedAttachmentExtension(file.name), {
      message: "file type is not allowed",
    }),
  description: z.string().trim().min(1).optional(),
});

export type UploadSampleAttachment = z.infer<
  typeof uploadSampleAttachmentSchema
>;

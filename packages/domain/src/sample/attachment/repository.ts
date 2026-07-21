import type { UpdateSampleAttachment } from "./attachment-validator.ts";
import type { SampleAttachment } from "./model.ts";

export type CreateSampleAttachment = {
  name: string;
  mediaType: string;
  description: string | null;
};

// Rows and blob move together: create persists the metadata and the content,
// reconcile drops both for unlisted attachments. Methods return null when the
// sample or the attachment does not exist.
export type SampleAttachmentRepository = {
  create(
    sampleId: string,
    input: CreateSampleAttachment,
    content: Uint8Array,
  ): Promise<SampleAttachment | null>;
  // Reconciles the sample's attachments against the given list (the sample
  // update payload): a listed attachment gets its description updated, an
  // unlisted one is removed with its content. Unknown ids are ignored.
  reconcile(
    sampleId: string,
    attachments: UpdateSampleAttachment[],
  ): Promise<void>;
  getContent(
    sampleId: string,
    attachmentId: string,
  ): Promise<{ attachment: SampleAttachment; content: Uint8Array } | null>;
};

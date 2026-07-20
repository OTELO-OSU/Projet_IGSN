import type { SampleAttachment } from "./model.ts";

export type CreateSampleAttachment = {
  name: string;
  mediaType: string;
  description: string | null;
};

// Rows and blob move together: create persists the metadata and the content,
// remove drops both. Methods return null/false when the sample or the
// attachment does not exist.
export type SampleAttachmentRepository = {
  create(
    sampleId: string,
    input: CreateSampleAttachment,
    content: Uint8Array,
  ): Promise<SampleAttachment | null>;
  updateDescription(
    sampleId: string,
    attachmentId: string,
    description: string | null,
  ): Promise<SampleAttachment | null>;
  remove(sampleId: string, attachmentId: string): Promise<boolean>;
  getContent(
    sampleId: string,
    attachmentId: string,
  ): Promise<{ attachment: SampleAttachment; content: Uint8Array } | null>;
};

import type { UpdateSampleAttachment } from "./attachment-validator.ts";
import type { SampleAttachment } from "./model.ts";

export type CreateSampleAttachment = {
  name: string;
  mediaType: string;
  description: string | null;
};

export type SampleAttachmentRepository = {
  create(
    sampleId: string,
    input: CreateSampleAttachment,
    content: Uint8Array,
  ): Promise<SampleAttachment | "limit_reached" | null>;
  reconcile(
    sampleId: string,
    attachments: UpdateSampleAttachment[],
  ): Promise<void>;
  remove(sampleId: string, attachmentId: string): Promise<boolean>;
  removeAll(sampleId: string): Promise<void>;
  getContent(
    sampleId: string,
    attachmentId: string,
  ): Promise<{ attachment: SampleAttachment; content: Uint8Array } | null>;
};

import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

import { attachmentMetadata } from "#/samples/attachment-metadata.ts";

export function hasUnsavedAttachmentChanges(
  saved: SampleAttachment[],
  { pending, deletions, edits }: SampleAttachmentChanges,
): boolean {
  return (
    pending.length > 0 ||
    deletions.length > 0 ||
    saved.some(
      (attachment) =>
        JSON.stringify(
          attachmentMetadata(attachment, edits[attachment.id] ?? {}),
        ) !== JSON.stringify(attachmentMetadata(attachment, {})),
    )
  );
}

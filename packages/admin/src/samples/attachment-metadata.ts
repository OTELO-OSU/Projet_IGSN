import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { RelationTargetResourceType } from "@projet-igsn/domain/sample/relation/target-resource-type";

export type AttachmentEdit = {
  title?: string;
  targetResourceType?: RelationTargetResourceType | "";
  description?: string;
};

export type AttachmentMetadata = Pick<
  SampleAttachment,
  "targetResourceType" | "title" | "description"
>;

type AttachmentChangesMetadata = {
  deletions: string[];
  edits: Record<string, AttachmentEdit>;
  pending: AttachmentEdit[];
};

export function attachmentMetadata(
  attachment: Partial<AttachmentMetadata>,
  edit: AttachmentEdit,
): AttachmentMetadata {
  return {
    title: (edit.title ?? attachment.title ?? "").trim() || null,
    targetResourceType:
      (edit.targetResourceType ?? attachment.targetResourceType) || null,
    description:
      (edit.description ?? attachment.description ?? "").trim() || null,
  };
}

export function keptAttachmentMetadata(
  saved: SampleAttachment[],
  changes?: AttachmentChangesMetadata,
): AttachmentMetadata[] {
  if (changes == null) return saved;
  return [
    ...saved
      .filter(({ id }) => !changes.deletions.includes(id))
      .map((attachment) =>
        attachmentMetadata(attachment, changes.edits[attachment.id] ?? {}),
      ),
    ...changes.pending.map((staged) => attachmentMetadata({}, staged)),
  ];
}

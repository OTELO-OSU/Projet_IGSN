import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  type UpdateSampleAttachment,
  uploadSampleAttachmentSchema,
} from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "react-oidc-context";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import {
  type UploadBatchItem,
  uploadAttachment,
} from "#/samples/upload-attachment.ts";

type StagedAttachment = {
  key: string;
  file: File;
  description?: string;
  error?: boolean;
};

// Every saved attachment to keep, with its edited description. The API deletes
// whatever the payload does not list.
function keptAttachments(
  saved: SampleAttachment[],
  deletions: string[],
  descriptions: Record<string, string>,
): UpdateSampleAttachment[] {
  return saved
    .filter((attachment) => !deletions.includes(attachment.id))
    .map((attachment) => ({
      id: attachment.id,
      description:
        (descriptions[attachment.id] ?? attachment.description ?? "").trim() ||
        null,
    }));
}

// The shared domain schema fronts the API's own check; any file type passes,
// only the size cap can reject. Checked at pick time so the user hears about it
// before submitting.
function acceptFiles(files: File[]): File[] {
  return files.filter((file) => {
    const isValid = uploadSampleAttachmentSchema.safeParse({ file }).success;
    if (!isValid) toast.error(m.attachment_too_large({ name: file.name }));
    return isValid;
  });
}

// Stages every attachment change locally (files to upload with their
// description, saved attachments to delete, edited descriptions) so cancelling
// the form leaves the server untouched. `commit` (called on form submit, before
// the sample save) uploads the staged files in parallel behind a progress
// dialog whose recap stays until the user closes it, then returns the
// attachments payload for the sample update.
export function useAttachmentChanges(sampleId: string) {
  const token = useAuth().user?.access_token;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<StagedAttachment[]>([]);
  const [deletions, setDeletions] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<UploadBatchItem[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const addFiles = (files: File[]) =>
    setPending((current) => [
      ...current,
      ...acceptFiles(files).map((file) => ({ key: crypto.randomUUID(), file })),
    ]);

  const removeFile = (key: string) =>
    setPending((current) => current.filter((staged) => staged.key !== key));

  const setPendingDescription = (key: string, description: string) =>
    setPending((current) =>
      current.map((staged) =>
        staged.key === key ? { ...staged, description } : staged,
      ),
    );

  const markDelete = (attachmentId: string) =>
    setDeletions((current) => [...current, attachmentId]);

  const restore = (attachmentId: string) =>
    setDeletions((current) => current.filter((id) => id !== attachmentId));

  const setDescription = (attachmentId: string, description: string) =>
    setDescriptions((current) => ({ ...current, [attachmentId]: description }));

  const setBatchItem = (key: string, patch: Partial<UploadBatchItem>) =>
    setBatch((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  const uploadStaged = async ({
    key,
    file,
    description,
  }: StagedAttachment): Promise<UpdateSampleAttachment | null> => {
    const created = await uploadAttachment(
      {
        url: new URL(`admin/samples/${sampleId}/attachments`, API_URL).href,
        token,
        file,
        description: description?.trim() || undefined,
      },
      (patch) => setBatchItem(key, patch),
    );
    // A file that did not make it stays staged, flagged for a retry on the next
    // submit, and never blocks saving the rest.
    if (created === null) {
      setPending((current) =>
        current.map((staged) =>
          staged.key === key ? { ...staged, error: true } : staged,
        ),
      );
      return null;
    }
    setPending((current) => current.filter((staged) => staged.key !== key));
    return { id: created.id, description: created.description };
  };

  const uploadPending = async (): Promise<UpdateSampleAttachment[]> => {
    const staged = pending;
    if (staged.length === 0) return [];
    setPending((current) => current.map((item) => ({ ...item, error: false })));
    setBatch(
      staged.map(({ key, file }) => ({
        key,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
      })),
    );
    setDialogOpen(true);
    // ponytail: a drop far above the budget still converges over several
    // windows, and a very large one exhausts the retries. Per-file queueing with
    // a real scheduler is the upgrade path if researchers routinely drop
    // hundreds of files.
    const results = await Promise.all(staged.map(uploadStaged));
    const uploaded = results.filter((result) => result !== null);
    if (uploaded.length > 0) {
      // Keeps the uploads visible even if the sample save then fails.
      await queryClient.invalidateQueries({ queryKey: ["samples"] });
    }
    // The dialog never closes itself: the user confirms the recap.
    return uploaded;
  };

  const commit = async (
    saved: SampleAttachment[],
  ): Promise<UpdateSampleAttachment[]> => {
    const uploaded = await uploadPending();
    return [...keptAttachments(saved, deletions, descriptions), ...uploaded];
  };

  return {
    pending,
    addFiles,
    removeFile,
    setPendingDescription,
    deletions,
    markDelete,
    restore,
    descriptions,
    setDescription,
    batch,
    commit,
    isDialogOpen,
    setDialogOpen,
  };
}

export type SampleAttachmentChanges = ReturnType<typeof useAttachmentChanges>;

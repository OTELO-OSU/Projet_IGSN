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
  type AttachmentEdit,
  attachmentMetadata,
} from "#/samples/attachment-metadata.ts";
import { uploadSampleAttachment } from "#/samples/upload-sample-attachment.ts";
import { useApiClient } from "#/use-api-client.ts";

type StagedAttachment = {
  key: string;
  file: File;
  error?: boolean;
} & AttachmentEdit;
type UploadBatchItem = {
  key: string;
  name: string;
  progress: number;
  status: "uploading" | "uploaded" | "failed";
};

export function useAttachmentChanges(sampleId: string) {
  const token = useAuth().user?.access_token;
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<StagedAttachment[]>([]);
  const [deletions, setDeletions] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, AttachmentEdit>>({});
  const [batch, setBatch] = useState<UploadBatchItem[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const addFiles = (files: File[]) => {
    const accepted = files.filter((file) => {
      const isValid = uploadSampleAttachmentSchema.safeParse({ file }).success;
      if (!isValid) toast.error(m.attachment_too_large({ name: file.name }));
      return isValid;
    });
    setPending((current) => [
      ...current,
      ...accepted.map((file) => ({ key: crypto.randomUUID(), file })),
    ]);
  };

  const removeFile = (key: string) =>
    setPending((current) => current.filter((staged) => staged.key !== key));

  const setPendingEdit = (key: string, edit: AttachmentEdit) =>
    setPending((current) =>
      current.map((staged) =>
        staged.key === key ? { ...staged, ...edit } : staged,
      ),
    );

  const markDelete = (attachmentId: string) =>
    setDeletions((current) => [...current, attachmentId]);

  const restore = (attachmentId: string) =>
    setDeletions((current) => current.filter((id) => id !== attachmentId));

  const setEdit = (attachmentId: string, edit: AttachmentEdit) =>
    setEdits((current) => ({
      ...current,
      [attachmentId]: { ...current[attachmentId], ...edit },
    }));

  const setBatchItem = (key: string, patch: Partial<UploadBatchItem>) =>
    setBatch((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  const uploadPending = async (): Promise<UpdateSampleAttachment[]> => {
    const staged = pending;
    if (staged.length === 0) return [];
    setPending((current) => current.map((s) => ({ ...s, error: false })));
    setBatch(
      staged.map(({ key, file }) => ({
        key,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
      })),
    );
    setDialogOpen(true);
    const results = await Promise.all(
      staged.map(async ({ key, file, error: _error, ...edit }) => {
        try {
          const created = await uploadSampleAttachment(
            new URL(`admin/samples/${sampleId}/attachments`, API_URL).href,
            token,
            file,
            edit,
            (progress) => setBatchItem(key, { progress }),
          );
          setBatchItem(key, { status: "uploaded" });
          setPending((current) => current.filter((s) => s.key !== key));
          return {
            id: created.id,
            title: created.title,
            targetResourceType: created.targetResourceType,
            description: created.description,
          };
        } catch {
          setBatchItem(key, { status: "failed" });
          setPending((current) =>
            current.map((s) => (s.key === key ? { ...s, error: true } : s)),
          );
          return null;
        }
      }),
    );
    const uploaded = results.filter((result) => result !== null);
    if (uploaded.length > 0) {
      await queryClient.invalidateQueries({ queryKey: ["samples"] });
    }
    return uploaded;
  };

  const commit = async (
    saved: SampleAttachment[],
  ): Promise<UpdateSampleAttachment[]> => {
    await Promise.all(
      deletions.map((id) =>
        apiFetch(
          new URL(`admin/samples/${sampleId}/attachments/${id}`, API_URL),
          {
            method: "DELETE",
          },
        ).catch(() => null),
      ),
    );
    setDeletions([]);
    const uploaded = await uploadPending();
    return [
      ...saved
        .filter((attachment) => !deletions.includes(attachment.id))
        .map((attachment) => ({
          id: attachment.id,
          ...attachmentMetadata(attachment, edits[attachment.id] ?? {}),
        })),
      ...uploaded,
    ];
  };

  return {
    pending,
    addFiles,
    removeFile,
    setPendingEdit,
    deletions,
    markDelete,
    restore,
    edits,
    setEdit,
    batch,
    commit,
    isDialogOpen,
    setDialogOpen,
  };
}

export type SampleAttachmentChanges = ReturnType<typeof useAttachmentChanges>;

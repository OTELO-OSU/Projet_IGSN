import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  type UpdateSampleAttachment,
  uploadSampleAttachmentSchema,
} from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { sampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/model";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { z } from "zod";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";

type StagedAttachment = {
  key: string;
  file: File;
  description?: string;
  error?: boolean;
};
type UploadBatchItem = {
  key: string;
  name: string;
  progress: number;
  status: "uploading" | "uploaded" | "failed";
};

const uploadResponseSchema = z.object({ data: sampleAttachmentSchema });

// XHR instead of the shared fetch client: fetch cannot report request-body
// progress, and a 100 MB video deserves a real progress bar. ponytail: no
// silent-renewal retry on 401 here; the upload just fails in the recap.
function xhrUpload(
  url: string,
  token: string | undefined,
  file: File,
  description: string | undefined,
  onProgress: (percent: number) => void,
): Promise<SampleAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) {
          throw new Error(`Upload failed (${xhr.status})`);
        }
        resolve(uploadResponseSchema.parse(JSON.parse(xhr.responseText)).data);
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const body = new FormData();
    body.append("file", file);
    if (description) body.append("description", description);
    xhr.send(body);
  });
}

// Stages every attachment change locally (files to upload with their
// description, saved attachments to delete, edited descriptions) so
// cancelling the form leaves the server untouched. `commit` (called on form
// submit, before the sample save) uploads the staged files in parallel behind
// a progress dialog whose recap stays until the user closes it, then returns
// the attachments payload for the sample update: every attachment to keep,
// with its description. The API deletes whatever is not listed. A failed
// upload stays staged, flagged for a retry on the next submit, and never
// blocks saving the rest.
export function useAttachmentChanges(sampleId: string) {
  const token = useAuth().user?.access_token;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<StagedAttachment[]>([]);
  const [deletions, setDeletions] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<UploadBatchItem[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const addFiles = (files: File[]) => {
    // The shared domain schema fronts the API's own check; any file type
    // passes, only the size cap can reject. Checked at pick time so the
    // user hears about it before submitting.
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

  // Unstaging a not-yet-uploaded file is purely local; no API call.
  const removeFile = (key: string) =>
    setPending((current) => current.filter((staged) => staged.key !== key));

  // A staged file's description uploads with it, in the same request.
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
      staged.map(async ({ key, file, description }) => {
        try {
          const created = await xhrUpload(
            new URL(`admin/samples/${sampleId}/attachments`, API_URL).href,
            token,
            file,
            description?.trim() || undefined,
            (progress) => setBatchItem(key, { progress }),
          );
          setBatchItem(key, { status: "uploaded" });
          setPending((current) => current.filter((s) => s.key !== key));
          return { id: created.id, description: created.description };
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
      // Keeps the uploads visible even if the sample save then fails.
      await queryClient.invalidateQueries({ queryKey: ["samples"] });
    }
    // The dialog never closes itself: the user confirms the recap.
    return uploaded;
  };

  // Uploads the staged files, then returns the attachments payload for the
  // sample update: the saved attachments not marked for deletion (with any
  // edited description) plus the freshly uploaded ones.
  const commit = async (
    saved: SampleAttachment[],
  ): Promise<UpdateSampleAttachment[]> => {
    const uploaded = await uploadPending();
    return [
      ...saved
        .filter((attachment) => !deletions.includes(attachment.id))
        .map((attachment) => ({
          id: attachment.id,
          description:
            (
              descriptions[attachment.id] ??
              attachment.description ??
              ""
            ).trim() || null,
        })),
      ...uploaded,
    ];
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

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { uploadSampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "react-oidc-context";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";

type AttachmentUpload = { key: string; name: string; progress: number };

// XHR instead of the shared fetch client: fetch cannot report request-body
// progress, and a 100 MB video deserves a real progress bar. ponytail: no
// silent-renewal retry on 401 here; the upload just fails with a toast.
function xhrUpload(
  url: string,
  token: string | undefined,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed"));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

// Uploads files to a sample, all in parallel, exposing per-file progress for
// the bars. Refreshes the sample once the batch settles so the new attachments
// appear in the list.
export function useUploadAttachments(sampleId: string) {
  const token = useAuth().user?.access_token;
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<AttachmentUpload[]>([]);

  const upload = async (files: File[]): Promise<void> => {
    await Promise.all(
      files.map(async (file) => {
        // The shared domain schema fronts the API's own check; any file type
        // passes, only the size cap can reject.
        if (!uploadSampleAttachmentSchema.safeParse({ file }).success) {
          toast.error(m.attachment_too_large({ name: file.name }));
          return;
        }
        const key = crypto.randomUUID();
        setUploads((current) => [
          ...current,
          { key, name: file.name, progress: 0 },
        ]);
        try {
          await xhrUpload(
            new URL(`admin/samples/${sampleId}/attachments`, API_URL).href,
            token,
            file,
            (progress) =>
              setUploads((current) =>
                current.map((upload) =>
                  upload.key === key ? { ...upload, progress } : upload,
                ),
              ),
          );
        } catch {
          toast.error(m.attachment_upload_error({ name: file.name }));
        } finally {
          setUploads((current) =>
            current.filter((upload) => upload.key !== key),
          );
        }
      }),
    );
    await queryClient.invalidateQueries({ queryKey: ["samples"] });
  };

  return { uploads, upload };
}

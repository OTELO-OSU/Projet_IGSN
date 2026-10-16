import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { sampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/model";
import { z } from "zod";

import type { AttachmentEdit } from "#/samples/attachment-metadata.ts";

const uploadResponseSchema = z.object({ data: sampleAttachmentSchema });

// ponytail: no silent-renewal retry on 401 here; the upload just fails in the
// recap.
export function xhrUpload(
  url: string,
  token: string | undefined,
  file: File,
  edit: AttachmentEdit,
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
    for (const [name, value] of Object.entries(edit)) {
      if (value?.trim()) body.append(name, value.trim());
    }
    xhr.send(body);
  });
}

import { UPLOAD_CHUNK_BYTES } from "@projet-igsn/domain/staged-upload/limits";
import { type DetailedError, Upload } from "tus-js-client";

import { API_URL } from "#/api-url.ts";
import { userManager } from "#/auth/oidc-config.ts";

export type StagedUploadProgress = {
  fileIndex: number;
  fileCount: number;
  currentFileName: string;
  uploadedBytes: number;
  fileSize: number;
  retryingAttempt?: number;
};

const RETRY_DELAYS_MS = [1_000, 5_000];

export const STAGED_UPLOAD_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

const TOO_MANY_REQUESTS = 429;

const isRetryable = (error: DetailedError): boolean => {
  const status = error.originalResponse?.getStatus() ?? 0;
  return status === 0 || status === TOO_MANY_REQUESTS || status >= 500;
};

type UploadEvents = {
  onBytes: (uploadedBytes: number) => void;
  onRetry: (attempt: number) => void;
};

function stageDocument(
  document: File,
  { onBytes, onRetry }: UploadEvents,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(document, {
      endpoint: new URL("admin/samples/import/uploads/", API_URL).href,
      chunkSize: UPLOAD_CHUNK_BYTES,
      retryDelays: RETRY_DELAYS_MS,
      metadata: {
        filename: document.name,
        filetype: document.type || "application/octet-stream",
      },
      storeFingerprintForResuming: false,
      onBeforeRequest: async (request) => {
        const user = await userManager.getUser();
        if (user)
          request.setHeader("Authorization", `Bearer ${user.access_token}`);
      },
      onShouldRetry: (error, retryAttempt) => {
        if (!isRetryable(error)) return false;
        onRetry(retryAttempt + 2);
        return true;
      },
      onProgress: onBytes,
      onSuccess: () => resolve(String(upload.url).split("/").at(-1) ?? ""),
      onError: reject,
    });
    upload.start();
  });
}

export async function uploadStagedDocuments(
  documents: File[],
  onProgress: (progress: StagedUploadProgress) => void,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [fileIndex, document] of documents.entries()) {
    let progress: StagedUploadProgress = {
      fileIndex,
      fileCount: documents.length,
      currentFileName: document.name,
      uploadedBytes: 0,
      fileSize: document.size,
    };
    const report = (change: Partial<StagedUploadProgress>) => {
      progress = { ...progress, ...change };
      onProgress(progress);
    };
    report({});
    ids.set(
      document.name,
      await stageDocument(document, {
        onBytes: (uploadedBytes) => report({ uploadedBytes }),
        onRetry: (retryingAttempt) => report({ retryingAttempt }),
      }),
    );
  }
  return ids;
}

import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { sampleAttachmentSchema } from "@projet-igsn/domain/sample/attachment/model";
import { z } from "zod";

import { HttpError, parseRetryAfter, retryDelay } from "#/http-error.ts";

export type UploadBatchItem = {
  key: string;
  name: string;
  progress: number;
  status: "uploading" | "queued" | "uploaded" | "failed" | "rate_limited";
};

type UploadRequest = {
  url: string;
  token: string | undefined;
  file: File;
  description: string | undefined;
};

type ReportProgress = (patch: Partial<UploadBatchItem>) => void;

const uploadResponseSchema = z.object({ data: sampleAttachmentSchema });

// A drop of more files than the upload budget allows is legitimate, so the
// overflow waits out the server's own Retry-After instead of failing. The
// budget itself is operator-tunable (RATE_LIMIT_ADMIN_ATTACHMENT_CREATE_POINTS),
// so it is never mirrored here: the 429 is the authoritative answer.
const UPLOAD_ATTEMPT_LIMIT = 3;

// The dialog cannot be dismissed while a file is queued, so the total wait is
// bounded: a window wider than this (an operator raising
// RATE_LIMIT_ADMIN_ATTACHMENT_CREATE_DURATION) settles as rate_limited at once
// rather than holding the form hostage. The file stays staged for the next save.
const UPLOAD_QUEUE_BUDGET_MS = 90_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimited = (error: unknown): error is HttpError =>
  error instanceof HttpError && error.status === 429;

// How long to hold a refused file before trying again, or null to settle it. A
// 429 is the only refusal worth waiting out, and how long to wait is the shared
// policy every other admin error already goes through.
function queueDelay(
  error: unknown,
  attempt: number,
  queuedMs: number,
): number | null {
  if (!isRateLimited(error) || attempt >= UPLOAD_ATTEMPT_LIMIT) return null;
  const delay = retryDelay(attempt, error);
  return queuedMs + delay <= UPLOAD_QUEUE_BUDGET_MS ? delay : null;
}

// onprogress fires per network chunk, far more often than the 100 percents it
// maps to; each duplicate would re-render the whole batch dialog.
function wholePercentProgress(report: ReportProgress) {
  let reported = -1;
  return (event: ProgressEvent) => {
    if (!event.lengthComputable) return;
    const progress = Math.round((event.loaded / event.total) * 100);
    if (progress === reported) return;
    reported = progress;
    report({ progress });
  };
}

function readResponse(xhr: XMLHttpRequest): SampleAttachment {
  if (xhr.status < 200 || xhr.status >= 300) {
    throw new HttpError(
      xhr.status,
      `Upload failed (${xhr.status})`,
      parseRetryAfter(xhr.getResponseHeader("Retry-After")),
    );
  }
  return uploadResponseSchema.parse(JSON.parse(xhr.responseText)).data;
}

function uploadBody(file: File, description: string | undefined): FormData {
  const body = new FormData();
  body.append("file", file);
  if (description) body.append("description", description);
  return body;
}

// XHR instead of the shared fetch client: fetch cannot report request-body
// progress, and a 100 MB video deserves a real progress bar. ponytail: no
// silent-renewal retry on 401 here; the upload just fails in the recap.
function sendUpload(
  { url, token, file, description }: UploadRequest,
  report: ReportProgress,
): Promise<SampleAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = wholePercentProgress(report);
    xhr.onload = () => {
      try {
        resolve(readResponse(xhr));
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(uploadBody(file, description));
  });
}

// Uploads one file, holding it while the api's upload budget refuses it, and
// reporting every state change to its row in the progress dialog. Null means
// the file settled unsent, either failed or still rate-limited.
export async function uploadAttachment(
  request: UploadRequest,
  report: ReportProgress,
): Promise<SampleAttachment | null> {
  let queuedMs = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      const created = await sendUpload(request, report);
      report({ status: "uploaded" });
      return created;
    } catch (error: unknown) {
      const delay = queueDelay(error, attempt, queuedMs);
      if (delay === null) {
        report({ status: isRateLimited(error) ? "rate_limited" : "failed" });
        return null;
      }
      queuedMs += delay;
      report({ status: "queued", progress: 0 });
      await wait(delay);
      report({ status: "uploading" });
    }
  }
}

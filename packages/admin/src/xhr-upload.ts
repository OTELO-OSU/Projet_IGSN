export type XhrResponse = { status: number; responseText: string };

type XhrUploadOptions = {
  onProgress: (percent: number) => void;
  onAttempt?: (attempt: number) => void;
};

const RETRY_DELAYS_MS = [1_000, 5_000];

export const UPLOAD_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

function sendOnce(
  url: string,
  token: string | undefined,
  body: FormData,
  onProgress: (percent: number) => void,
): Promise<XhrResponse | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      resolve({ status: xhr.status, responseText: xhr.responseText });
    xhr.onerror = () => resolve(null);
    xhr.send(body);
  });
}

export async function xhrUpload(
  url: string,
  token: string | undefined,
  body: FormData,
  { onProgress, onAttempt }: XhrUploadOptions,
): Promise<XhrResponse> {
  for (const [index, delayMs] of [...RETRY_DELAYS_MS, null].entries()) {
    onAttempt?.(index + 1);
    onProgress(0);
    const response = await sendOnce(url, token, body, onProgress);
    if (response) return response;
    if (delayMs === null) break;
    // ponytail: a response lost after the server committed duplicates the upload on retry, like a user re-clicking; an idempotency key is the upgrade path
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Upload failed");
}

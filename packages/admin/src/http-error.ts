export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// A 4xx says the request itself is wrong: retrying only delays the error the
// page already knows how to render. Without this, opening another researcher's
// sample spins on "Loading..." for 7s (react-query retries 3 times by default,
// 1s/2s/4s backoff) and the api absorbs four denials. A 5xx or a network
// failure has no status under 500 and keeps the retries.
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof HttpError && error.status < 500) {
    return false;
  }
  return failureCount < 3;
}

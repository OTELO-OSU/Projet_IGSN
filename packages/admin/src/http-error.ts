// Anything unparseable falls back to a second, so a malformed header still
// paces the retry instead of hammering the api.
export function parseRetryAfter(header: string): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }

  static fromResponse(res: Response, message: string): HttpError {
    const header = res.headers.get("Retry-After");
    return new HttpError(
      res.status,
      message,
      header === null ? undefined : parseRetryAfter(header),
    );
  }
}

// A 429 is the exception: the request was fine, the budget was spent, and the
// api says when it reopens, so it is retried once at that pace.
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof HttpError && error.status === 429) {
    return failureCount < 1;
  }
  if (error instanceof HttpError && error.status < 500) {
    return false;
  }
  return failureCount < 3;
}

// react-query's exponential backoff is blind to how long the rate-limit window
// still has to run, so an error carrying Retry-After waits out that instead.
export function retryDelay(failureCount: number, error: Error): number {
  if (error instanceof HttpError && error.retryAfterMs !== undefined) {
    return error.retryAfterMs;
  }
  return Math.min(1000 * 2 ** failureCount, 30_000);
}

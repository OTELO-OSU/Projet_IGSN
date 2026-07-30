// The api sends whole seconds, but RFC 9110 also allows an HTTP date, which a
// 429 from Cloudflare or Caddy can carry. Anything unparseable falls back to a
// second so a malformed header still paces the retry instead of hammering.
export function parseRetryAfter(header: string | null): number {
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = header ? Date.parse(header) : Number.NaN;
  return Number.isNaN(date) ? 1000 : Math.max(date - Date.now(), 1000);
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

// A 4xx says the request itself is wrong: retrying only delays the error the
// page already knows how to render. Without this, opening another researcher's
// sample spins on "Loading..." for 7s (react-query retries 3 times by default,
// 1s/2s/4s backoff) and the api absorbs four denials. A 5xx or a network
// failure has no status under 500 and keeps the retries.
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

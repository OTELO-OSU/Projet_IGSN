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

export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof HttpError && error.status === 429) {
    return failureCount < 1;
  }
  if (error instanceof HttpError && error.status < 500) {
    return false;
  }
  return failureCount < 3;
}

export function retryDelay(failureCount: number, error: Error): number {
  if (error instanceof HttpError && error.retryAfterMs !== undefined) {
    return error.retryAfterMs;
  }
  return Math.min(1000 * 2 ** failureCount, 30_000);
}

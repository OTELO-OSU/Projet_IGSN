import { HttpError, retryDelay, shouldRetry } from "./http-error.ts";

const responded = (status: number, retryAfter?: string) =>
  HttpError.fromResponse(
    new Response(null, {
      status,
      headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
    }),
    "rejected",
  );

describe("HttpError.fromResponse", () => {
  it("should read Retry-After in seconds", () => {
    expect(responded(429, "60").retryAfterMs).toBe(60_000);
  });

  it.each(["not-a-date", "0", "-5"])(
    "should fall back to a second on %s",
    (header) => {
      expect(responded(429, header).retryAfterMs).toBe(1000);
    },
  );

  it("should carry no delay when the response has no Retry-After", () => {
    expect(responded(503).retryAfterMs).toBeUndefined();
  });
});

describe("shouldRetry", () => {
  it.each([400, 403, 404, 409])("should not retry a %i", (status) => {
    expect(shouldRetry(0, new HttpError(status, "rejected"))).toBe(false);
  });

  it.each([500, 503])("should retry a %i", (status) => {
    expect(shouldRetry(0, new HttpError(status, "boom"))).toBe(true);
  });

  it("should retry a 429 once", () => {
    expect(shouldRetry(0, responded(429, "60"))).toBe(true);
    expect(shouldRetry(1, responded(429, "60"))).toBe(false);
  });

  it("should retry a network failure", () => {
    expect(shouldRetry(0, new Error("fetch failed"))).toBe(true);
  });

  it("should give up after three attempts", () => {
    expect(shouldRetry(3, new Error("fetch failed"))).toBe(false);
  });
});

describe("retryDelay", () => {
  it("should wait out the window a 429 asks for", () => {
    expect(retryDelay(0, responded(429, "60"))).toBe(60_000);
  });

  it.each([
    [0, 1000],
    [1, 2000],
    [2, 4000],
  ])("should back off exponentially on attempt %i", (attempt, expected) => {
    expect(retryDelay(attempt, new Error("fetch failed"))).toBe(expected);
  });

  it("should cap the backoff at thirty seconds", () => {
    expect(retryDelay(10, new Error("fetch failed"))).toBe(30_000);
  });
});

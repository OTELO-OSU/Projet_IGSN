import { z } from "zod";

import {
  apiJson,
  apiOk,
  HttpError,
  retryDelay,
  shouldRetry,
} from "./http-error.ts";

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

describe("apiJson", () => {
  const url = new URL("https://api.test/samples");
  const bodySchema = z.object({ name: z.string() });

  it("should return the body parsed by the schema", async () => {
    const parsed = await apiJson(
      async () => Response.json({ name: "Ada", extra: 1 }),
      url,
      bodySchema,
      "Failed to load the sample",
    );
    expect(parsed).toEqual({ name: "Ada" });
  });

  it("should throw the given message with the status appended", async () => {
    const rejection = await apiJson(
      async () => new Response(null, { status: 404 }),
      url,
      bodySchema,
      "Failed to load the sample",
    ).catch((error: unknown) => error);
    expect(rejection).toMatchObject({
      status: 404,
      message: "Failed to load the sample (404)",
    });
  });

  it("should carry the delay the response asks for", async () => {
    const rejection = await apiJson(
      async () =>
        new Response(null, { status: 429, headers: { "Retry-After": "60" } }),
      url,
      bodySchema,
      "Failed to load the sample",
    ).catch((error: unknown) => error);
    expect(rejection).toMatchObject({ retryAfterMs: 60_000 });
  });
});

describe("apiOk", () => {
  it("should resolve a response carrying no body", async () => {
    const res = await apiOk(
      async () => new Response(null, { status: 204 }),
      new URL("https://api.test/samples/1"),
      "Failed to delete the sample",
      { method: "DELETE" },
    );
    expect(res.status).toBe(204);
  });
});

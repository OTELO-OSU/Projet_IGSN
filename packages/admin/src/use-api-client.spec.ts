import { withAuthToken } from "./use-api-client.ts";

// Records the headers the wrapped fetch is called with, so tests assert on the
// request shape without mocking the global fetch.
function recordingFetch(): {
  fetch: typeof fetch;
  lastHeaders: () => Headers | undefined;
} {
  let seen: Headers | undefined;
  const fetchFn: typeof fetch = async (_input, init) => {
    seen = new Headers(init?.headers);
    return new Response();
  };
  return { fetch: fetchFn, lastHeaders: () => seen };
}

describe("withAuthToken", () => {
  it("should add the bearer token to the Authorization header", async () => {
    const { fetch, lastHeaders } = recordingFetch();
    await withAuthToken(fetch, "tok-123")("http://api/me");
    expect(lastHeaders()?.get("Authorization")).toBe("Bearer tok-123");
  });

  it("should not set Authorization when there is no token", async () => {
    const { fetch, lastHeaders } = recordingFetch();
    await withAuthToken(fetch, undefined)("http://api/me");
    expect(lastHeaders()?.has("Authorization")).toBe(false);
  });

  it("should preserve headers already on the request", async () => {
    const { fetch, lastHeaders } = recordingFetch();
    await withAuthToken(fetch, "tok")("http://api/x", {
      headers: { "content-type": "application/json" },
    });
    expect(lastHeaders()?.get("content-type")).toBe("application/json");
    expect(lastHeaders()?.get("Authorization")).toBe("Bearer tok");
  });
});

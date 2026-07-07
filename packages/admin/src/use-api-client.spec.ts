import { afterEach, describe, expect, it, vi } from "vitest";

import { withAuthToken, withSessionRenewal } from "./use-api-client.ts";

const { signinSilent, signinRedirect } = vi.hoisted(() => ({
  signinSilent: vi.fn(),
  signinRedirect: vi.fn(),
}));

vi.mock("./auth/oidc-config.ts", () => ({
  userManager: { signinSilent, signinRedirect },
}));

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

describe("withSessionRenewal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should return the response unchanged when it is not a 401", async () => {
    const inner = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    const res = await withSessionRenewal(inner)("http://api/x");

    expect(res.status).toBe(200);
    expect(signinSilent).not.toHaveBeenCalled();
  });

  it("should renew once and retry with the fresh token on a 401", async () => {
    const inner = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    signinSilent.mockResolvedValue({ access_token: "fresh" });
    const retried = new Response(null, { status: 200 });
    const globalFetch = vi.fn<typeof fetch>().mockResolvedValue(retried);
    vi.stubGlobal("fetch", globalFetch);

    const res = await withSessionRenewal(inner)("http://api/x");

    expect(res).toBe(retried);
    expect(signinSilent).toHaveBeenCalledTimes(1);
    expect(
      new Headers(globalFetch.mock.calls.at(-1)?.[1]?.headers).get(
        "Authorization",
      ),
    ).toBe("Bearer fresh");
  });

  it("should sign in interactively when the renewal fails", async () => {
    const inner = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    signinSilent.mockRejectedValue(new Error("expired"));

    await expect(withSessionRenewal(inner)("http://api/x")).rejects.toThrow(
      /session expired/i,
    );
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should sign in interactively when the renewed token is still rejected", async () => {
    const inner = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    signinSilent.mockResolvedValue({ access_token: "fresh" });
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(withSessionRenewal(inner)("http://api/x")).rejects.toThrow(
      /session expired/i,
    );
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });
});

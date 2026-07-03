import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMe } from "./api.ts";

const { signinSilent, signinRedirect } = vi.hoisted(() => ({
  signinSilent: vi.fn(),
  signinRedirect: vi.fn(),
}));

vi.mock("./auth/oidc-config.ts", () => ({
  userManager: { signinSilent, signinRedirect },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("fetchMe", () => {
  it("should return the verified identity", async () => {
    fetchMock.mockResolvedValue(ok({ sub: "s", name: "Marie Dupont" }));

    await expect(fetchMe("tok")).resolves.toEqual({
      sub: "s",
      name: "Marie Dupont",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3002/me", {
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("should renew the session once and retry when the api answers 401", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(ok({ sub: "s", name: "Marie Dupont" }));
    signinSilent.mockResolvedValue({ access_token: "fresh" });

    await expect(fetchMe("stale")).resolves.toEqual({
      sub: "s",
      name: "Marie Dupont",
    });

    expect(signinSilent).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith("http://localhost:3002/me", {
      headers: { Authorization: "Bearer fresh" },
    });
  });

  it("should fall back to an interactive sign-in when the renewal fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    signinSilent.mockRejectedValue(new Error("expired"));

    await expect(fetchMe("stale")).rejects.toThrow(/session expired/i);
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should throw on a non-401 error without renewing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(fetchMe("tok")).rejects.toThrow("API responded 500");
    expect(signinSilent).not.toHaveBeenCalled();
  });
});

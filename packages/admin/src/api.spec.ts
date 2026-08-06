import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { worker } from "../test/msw.ts";
import { fetchCurrentUser } from "./api.ts";

const { signinSilent, signinRedirect } = vi.hoisted(() => ({
  signinSilent: vi.fn(),
  signinRedirect: vi.fn(),
}));

vi.mock("./auth/oidc-config.ts", () => ({
  userManager: { signinSilent, signinRedirect },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function captureCurrentUser(
  ...responses: ((request: Request) => Response | Promise<Response>)[]
) {
  const seen: { url: string; authorization: string | null }[] = [];
  worker.use(
    http.get("*/admin/currentUser", ({ request }) => {
      seen.push({
        url: request.url,
        authorization: request.headers.get("Authorization"),
      });
      const respond = responses.length > 1 ? responses.shift()! : responses[0]!;
      return respond(request);
    }),
  );
  return seen;
}

const identity = {
  sub: "s",
  name: "Marie Dupont",
  orcid: null,
  status: "accepted",
  superAdmin: false,
};

const ok = (body: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(body);
const unauthorized = () => new HttpResponse(null, { status: 401 });

describe("fetchCurrentUser", () => {
  it("should return the verified identity", async () => {
    const seen = captureCurrentUser(() => ok(identity));

    await expect(fetchCurrentUser("tok")).resolves.toEqual(identity);
    expect(seen).toEqual([
      {
        url: "http://localhost:3002/admin/currentUser",
        authorization: "Bearer tok",
      },
    ]);
  });

  it("should renew the session once and retry when the api answers 401", async () => {
    const seen = captureCurrentUser(unauthorized, () => ok(identity));
    signinSilent.mockResolvedValue({ access_token: "fresh" });

    await expect(fetchCurrentUser("stale")).resolves.toEqual(identity);

    expect(signinSilent).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      {
        url: "http://localhost:3002/admin/currentUser",
        authorization: "Bearer stale",
      },
      {
        url: "http://localhost:3002/admin/currentUser",
        authorization: "Bearer fresh",
      },
    ]);
  });

  it("should sign in interactively when the renewed token is still rejected", async () => {
    captureCurrentUser(unauthorized);
    signinSilent.mockResolvedValue({ access_token: "fresh" });

    await expect(fetchCurrentUser("stale")).rejects.toThrow(/session expired/i);
    expect(signinSilent).toHaveBeenCalledTimes(1);
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should fall back to an interactive sign-in when the renewal fails", async () => {
    captureCurrentUser(unauthorized);
    signinSilent.mockRejectedValue(new Error("expired"));

    await expect(fetchCurrentUser("stale")).rejects.toThrow(/session expired/i);
    expect(signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should throw on a non-401 error without renewing", async () => {
    captureCurrentUser(() => new HttpResponse(null, { status: 500 }));

    await expect(fetchCurrentUser("tok")).rejects.toThrow("API responded 500");
    expect(signinSilent).not.toHaveBeenCalled();
  });
});

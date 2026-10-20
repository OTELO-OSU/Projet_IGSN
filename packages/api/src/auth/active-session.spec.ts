import { Hono } from "hono";
import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("./active-session.ts");

import { requireActiveSession } from "./active-session.ts";

const app = () =>
  new Hono().post("/critical", requireActiveSession, (c) =>
    c.json({ ok: true }),
  );

const USERINFO_URI =
  "http://localhost:8080/realms/igsn/protocol/openid-connect/userinfo";

describe("requireActiveSession", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should pass and forward the bearer token to userinfo when the session is active", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const res = await testClient(app()).critical.$post(undefined, {
      headers: { Authorization: "Bearer tok" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(USERINFO_URI, {
      headers: { Authorization: "Bearer tok" },
      signal: expect.any(AbortSignal),
    });
  });

  it("should return 401 without a trace when Keycloak reports the session revoked", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const res = await testClient(app()).critical.$post(undefined, {
      headers: { Authorization: "Bearer tok" },
    });

    expect(res.status).toBe(401);
    expect(logged).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it("should return 401 and trace why when the userinfo endpoint is unreachable", async () => {
    const error = new Error("network down");
    fetchMock.mockRejectedValue(error);
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const res = await testClient(app()).critical.$post(undefined, {
      headers: { Authorization: "Bearer tok" },
    });

    expect(res.status).toBe(401);
    expect(logged).toHaveBeenCalledWith("userinfo request failed", {
      userinfoUri: USERINFO_URI,
      error,
    });
    logged.mockRestore();
  });

  it("should return 401 when userinfo does not answer within 5 seconds", async () => {
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() =>
        AbortSignal.abort(new DOMException("timed out", "TimeoutError")),
      );
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.throwIfAborted();
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const res = await testClient(app()).critical.$post(undefined, {
      headers: { Authorization: "Bearer tok" },
    });

    expect(res.status).toBe(401);
    expect(timeout).toHaveBeenCalledWith(5000);
    timeout.mockRestore();
    logged.mockRestore();
  });

  it("should return 401 without calling Keycloak when no token is presented", async () => {
    const res = await testClient(app()).critical.$post();

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { Hono } from "hono";
import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    });
  });

  it("should return 401 when Keycloak reports the session revoked", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const res = await testClient(app()).critical.$post(undefined, {
      headers: { Authorization: "Bearer tok" },
    });

    expect(res.status).toBe(401);
  });

  it("should return 401 without calling Keycloak when no token is presented", async () => {
    const res = await testClient(app()).critical.$post();

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

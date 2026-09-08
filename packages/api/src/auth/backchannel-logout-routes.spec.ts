import type { webcrypto } from "node:crypto";

import { afterEach, beforeAll, beforeEach, describe, expect, vi } from "vitest";

import type { createApp } from "../app.ts";
import type { TestJwks } from "../tests/oidc-token.ts";

import {
  exportJwks,
  generateRsaKeyPair,
  mintJwt,
} from "../tests/oidc-token.ts";
import { pgTest } from "../tests/pg-test.ts";

vi.unmock("./middleware.ts");

const ISSUER = "http://localhost:8080/realms/igsn";
const CLIENT_ID = "igsn-admin";
const LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

let privateKey: webcrypto.CryptoKey;
let jwks: TestJwks;

beforeAll(async () => {
  // ponytail: pre-evaluates the app module graph (mjml is slow), since the first per-test dynamic import otherwise blows the test timeout
  await import("../app.ts");
  const pair = await generateRsaKeyPair();
  privateKey = pair.privateKey;
  jwks = await exportJwks(pair.publicKey);
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(jwks)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const nowSeconds = () => Math.floor(Date.now() / 1000);

const logoutClaims = (session: { sid?: string; sub?: string }) => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  iat: nowSeconds(),
  jti: "logout-token-1",
  events: { [LOGOUT_EVENT]: {} },
  ...session,
});

const accessClaims = (session: { sid: string; sub: string }) => ({
  iss: ISSUER,
  azp: CLIENT_ID,
  typ: "Bearer",
  exp: nowSeconds() + 300,
  email: `${session.sub}@univ-lorraine.fr`,
  given_name: "Marie",
  family_name: "Dupont",
  identity_provider: "satosa",
  ...session,
});

const createTestApp = async (db: Parameters<typeof createApp>[0]) => {
  vi.stubEnv("OIDC_AUDIENCE", undefined);
  vi.stubEnv("OIDC_ISSUER", ISSUER);
  vi.stubEnv("OIDC_CLIENT_ID", CLIENT_ID);
  vi.resetModules();
  const { createApp } = await import("../app.ts");

  return createApp(db).app;
};

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const postLogoutToken = (app: TestApp, logoutToken: string) =>
  app.request("/auth/backchannel-logout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ logout_token: logoutToken }).toString(),
  });

const getCurrentUserStatus = async (
  app: TestApp,
  session: { sid: string; sub: string },
) => {
  const res = await app.request("/admin/currentUser", {
    headers: {
      Authorization: `Bearer ${await mintJwt(accessClaims(session), privateKey)}`,
    },
  });

  return res.status;
};

describe("back-channel logout", () => {
  pgTest(
    "should stop honouring the access tokens of the logged out session alone",
    async ({ db }) => {
      const app = await createTestApp(db);

      const res = await postLogoutToken(
        app,
        await mintJwt(
          logoutClaims({ sid: "session-1", sub: "user-1" }),
          privateKey,
          { typ: "Logout+JWT" },
        ),
      );

      expect(res.status).toBe(204);
      expect(
        await getCurrentUserStatus(app, { sid: "session-1", sub: "user-1" }),
      ).toBe(401);
      expect(
        await getCurrentUserStatus(app, { sid: "session-2", sub: "user-1" }),
      ).toBe(200);
    },
  );

  pgTest(
    "should stop honouring a subject's access tokens when the logout token carries no sid",
    async ({ db }) => {
      const app = await createTestApp(db);

      const res = await postLogoutToken(
        app,
        await mintJwt(logoutClaims({ sub: "user-1" }), privateKey),
      );

      expect(res.status).toBe(204);
      expect(
        await getCurrentUserStatus(app, { sid: "session-1", sub: "user-1" }),
      ).toBe(401);
    },
  );

  pgTest.for([
    { case: 'a "logout+jwt" typ', header: { typ: "logout+jwt" } },
    { case: 'a "JWT" typ', header: { typ: "JWT" } },
  ])("should accept a logout token with $case", async ({ header }, { db }) => {
    const app = await createTestApp(db);

    const res = await postLogoutToken(
      app,
      await mintJwt(
        logoutClaims({ sid: "session-1", sub: "user-1" }),
        privateKey,
        header,
      ),
    );

    expect(res.status).toBe(204);
  });

  pgTest.for([
    { case: 'an "ID" typ', header: { typ: "ID" } },
    { case: 'an "HS256" alg', header: { alg: "HS256" } },
    { case: "an unknown kid", header: { kid: "another-key" } },
  ])("should reject a logout token with $case", async ({ header }, { db }) => {
    const app = await createTestApp(db);

    const res = await postLogoutToken(
      app,
      await mintJwt(
        logoutClaims({ sid: "session-1", sub: "user-1" }),
        privateKey,
        header,
      ),
    );

    expect(res.status).toBe(400);
  });

  pgTest.for([
    { case: "carrying a nonce", claims: { nonce: "n-1" } },
    { case: "issued to another audience", claims: { aud: "another-client" } },
    { case: "carrying no logout event", claims: { events: undefined } },
    {
      case: "from another issuer",
      claims: { iss: "http://evil.example.test/realms/igsn" },
    },
  ])(
    "should reject a logout token $case and revoke nothing",
    async ({ claims }, { db }) => {
      const app = await createTestApp(db);

      const res = await postLogoutToken(
        app,
        await mintJwt(
          {
            ...logoutClaims({ sid: "session-1", sub: "user-1" }),
            ...claims,
          },
          privateKey,
        ),
      );

      expect(res.status).toBe(400);
      expect(
        await getCurrentUserStatus(app, { sid: "session-1", sub: "user-1" }),
      ).toBe(200);
    },
  );

  pgTest(
    "should reject a logout token signed by an unknown key and revoke nothing",
    async ({ db }) => {
      const app = await createTestApp(db);
      const rogue = await generateRsaKeyPair();

      const res = await postLogoutToken(
        app,
        await mintJwt(
          logoutClaims({ sid: "session-1", sub: "user-1" }),
          rogue.privateKey,
        ),
      );

      expect(res.status).toBe(400);
      expect(
        await getCurrentUserStatus(app, { sid: "session-1", sub: "user-1" }),
      ).toBe(200);
    },
  );
});

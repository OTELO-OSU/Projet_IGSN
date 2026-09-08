import type { webcrypto } from "node:crypto";

import { testClient } from "hono/testing";
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
const AUDIENCE = "igsn-api";
const CLIENT_ID = "igsn-admin";

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

const mint = (
  claims: Record<string, unknown>,
  key: webcrypto.CryptoKey = privateKey,
): Promise<string> => mintJwt(claims, key);

const nowSeconds = () => Math.floor(Date.now() / 1000);

const validClaims = () => ({
  iss: ISSUER,
  azp: CLIENT_ID,
  typ: "Bearer",
  exp: nowSeconds() + 300,
  sub: "user-1",
  preferred_username: "marie",
  name: "Marie Dupont",
  email: "marie.dupont@univ-lorraine.fr",
  identity_provider: "satosa",
});

const getMe = async (
  db: Parameters<typeof createApp>[0],
  token: string,
  audience?: string,
) => {
  vi.stubEnv("OIDC_AUDIENCE", audience);
  vi.stubEnv("OIDC_ISSUER", ISSUER);
  vi.stubEnv("OIDC_CLIENT_ID", CLIENT_ID);
  vi.resetModules();
  const { createApp } = await import("../app.ts");

  return testClient(createApp(db).app).admin.currentUser.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

describe("requireAuth", () => {
  pgTest(
    "should return the verified claims for a valid token",
    async ({ db }) => {
      const res = await getMe(db, await mint(validClaims()));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        id: expect.any(String),
        sub: "user-1",
        username: "marie",
        name: "Marie Dupont",
        email: "marie.dupont@univ-lorraine.fr",
        orcid: null,
        status: "pending",
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: null,
      });
    },
  );

  pgTest(
    "should accept a matching audience when OIDC_AUDIENCE is set",
    async ({ db }) => {
      const res = await getMe(
        db,
        await mint({ ...validClaims(), aud: AUDIENCE }),
        AUDIENCE,
      );

      expect(res.status).toBe(200);
    },
  );

  pgTest.for([
    { case: "with the wrong audience", claims: { aud: "someone-else" } },
    { case: "without audience", claims: {} },
  ])(
    "should reject a token $case when OIDC_AUDIENCE is set",
    async ({ claims }, { db }) => {
      const res = await getMe(
        db,
        await mint({ ...validClaims(), ...claims }),
        AUDIENCE,
      );

      expect(res.status).toBe(401);
    },
  );

  pgTest.for([
    { case: "issued to another client", claims: { azp: "another-client" } },
    {
      case: "carrying no azp or typ",
      claims: { azp: undefined, typ: undefined },
    },
    { case: "replayed from an ID token", claims: { typ: "ID" } },
    { case: "carrying no exp", claims: { exp: undefined } },
    {
      case: "with the wrong issuer",
      claims: { iss: "http://evil.example.test/realms/igsn" },
    },
    { case: "expired", claims: { exp: nowSeconds() - 10 } },
  ])("should reject a token $case", async ({ claims }, { db }) => {
    const res = await getMe(db, await mint({ ...validClaims(), ...claims }));

    expect(res.status).toBe(401);
  });

  pgTest("should reject a token signed by an unknown key", async ({ db }) => {
    const rogue = await generateRsaKeyPair();

    const res = await getMe(db, await mint(validClaims(), rogue.privateKey));

    expect(res.status).toBe(401);
  });
});

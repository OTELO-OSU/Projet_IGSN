import type { webcrypto } from "node:crypto";

import { testClient } from "hono/testing";
import { afterEach, beforeAll, beforeEach, describe, expect, vi } from "vitest";

import type { createApp } from "../app.ts";

import { pgTest } from "../tests/pg-test.ts";

// test/setup.ts stubs requireAuth suite-wide; this spec verifies the real
// middleware, signature check included.
vi.unmock("./middleware.ts");

const KID = "test-key";
const ISSUER = "http://localhost:8080/realms/igsn";
const AUDIENCE = "igsn-api";
const CLIENT_ID = "igsn-admin";

const b64url = (data: string | Uint8Array): string =>
  Buffer.from(data).toString("base64url");

type TestJwk = webcrypto.JsonWebKey & { kid: string; alg: string };

let privateKey: webcrypto.CryptoKey;
let jwks: { keys: TestJwk[] };

const generateRsaKeyPair = () =>
  crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

beforeAll(async () => {
  const pair = await generateRsaKeyPair();
  privateKey = pair.privateKey;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  jwks = { keys: [{ ...publicJwk, kid: KID, alg: "RS256" }] };
});

beforeEach(() => {
  // requireAuth fetches the realm JWKS over HTTP; serve the test key instead.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(jwks)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// The header always claims KID so a token minted with another key exercises
// the signature check, not just a kid lookup miss.
async function mint(
  claims: Record<string, unknown>,
  key: webcrypto.CryptoKey = privateKey,
): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: KID }));
  const payload = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

// GaiaData tokens carry no aud claim, so the valid token has none either; azp
// and typ are what Keycloak stamps on an access token issued to our client.
const validClaims = () => ({
  iss: ISSUER,
  azp: CLIENT_ID,
  typ: "Bearer",
  exp: nowSeconds() + 300,
  sub: "user-1",
  preferred_username: "marie",
  name: "Marie Dupont",
  email: "marie.dupont@univ-lorraine.fr",
});

// The middleware reads its env once, when it is imported, so each auth
// configuration needs its own module graph.
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
        sub: "user-1",
        username: "marie",
        name: "Marie Dupont",
        email: "marie.dupont@univ-lorraine.fr",
        orcid: null,
        status: "pending",
        superAdmin: false,
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

  pgTest(
    "should reject a token with the wrong audience when OIDC_AUDIENCE is set",
    async ({ db }) => {
      const res = await getMe(
        db,
        await mint({ ...validClaims(), aud: "someone-else" }),
        AUDIENCE,
      );

      expect(res.status).toBe(401);
    },
  );

  pgTest(
    "should reject a token without audience when OIDC_AUDIENCE is set",
    async ({ db }) => {
      const res = await getMe(db, await mint(validClaims()), AUDIENCE);

      expect(res.status).toBe(401);
    },
  );

  pgTest("should reject a token issued to another client", async ({ db }) => {
    const res = await getMe(
      db,
      await mint({ ...validClaims(), azp: "another-client" }),
    );

    expect(res.status).toBe(401);
  });

  pgTest("should reject a token carrying no azp or typ", async ({ db }) => {
    const { azp: _azp, typ: _typ, ...claims } = validClaims();

    const res = await getMe(db, await mint(claims));

    expect(res.status).toBe(401);
  });

  pgTest("should reject an ID token replayed as a bearer", async ({ db }) => {
    const res = await getMe(db, await mint({ ...validClaims(), typ: "ID" }));

    expect(res.status).toBe(401);
  });

  pgTest("should reject a token carrying no exp", async ({ db }) => {
    const { exp: _exp, ...claims } = validClaims();

    const res = await getMe(db, await mint(claims));

    expect(res.status).toBe(401);
  });

  pgTest("should reject a token with the wrong issuer", async ({ db }) => {
    const res = await getMe(
      db,
      await mint({
        ...validClaims(),
        iss: "http://evil.example.test/realms/igsn",
      }),
    );

    expect(res.status).toBe(401);
  });

  pgTest("should reject an expired token", async ({ db }) => {
    const res = await getMe(
      db,
      await mint({ ...validClaims(), exp: nowSeconds() - 10 }),
    );

    expect(res.status).toBe(401);
  });

  pgTest("should reject a token signed by an unknown key", async ({ db }) => {
    const rogue = await generateRsaKeyPair();

    const res = await getMe(db, await mint(validClaims(), rogue.privateKey));

    expect(res.status).toBe(401);
  });
});

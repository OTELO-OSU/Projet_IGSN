import type { webcrypto } from "node:crypto";

import { testClient } from "hono/testing";
import { afterEach, beforeAll, beforeEach, describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

// test/setup.ts stubs requireAuth suite-wide; this spec verifies the real
// middleware, signature check included.
vi.unmock("./middleware.ts");

const KID = "test-key";
const ISSUER = "http://localhost:8080/realms/igsn";
const AUDIENCE = "igsn-api";

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

const validClaims = () => ({
  iss: ISSUER,
  aud: AUDIENCE,
  exp: nowSeconds() + 300,
  sub: "user-1",
  preferred_username: "marie",
  name: "Marie Dupont",
  email: "marie.dupont@univ-lorraine.fr",
});

const getMe = async (db: Parameters<typeof createApp>[0], token: string) =>
  testClient(createApp(db)).admin.me.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });

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
      });
    },
  );

  pgTest("should reject a token with the wrong audience", async ({ db }) => {
    const res = await getMe(
      db,
      await mint({ ...validClaims(), aud: "someone-else" }),
    );

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

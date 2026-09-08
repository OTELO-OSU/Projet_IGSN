import type { webcrypto } from "node:crypto";

export const TEST_KID = "test-key";

export type TestJwks = {
  keys: (webcrypto.JsonWebKey & { kid: string; alg: string })[];
};

const b64url = (data: string | Uint8Array): string =>
  Buffer.from(data).toString("base64url");

export const generateRsaKeyPair = (): Promise<webcrypto.CryptoKeyPair> =>
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

export const exportJwks = async (
  publicKey: webcrypto.CryptoKey,
): Promise<TestJwks> => ({
  keys: [
    {
      ...(await crypto.subtle.exportKey("jwk", publicKey)),
      kid: TEST_KID,
      alg: "RS256",
    },
  ],
});

export async function mintJwt(
  claims: Record<string, unknown>,
  key: webcrypto.CryptoKey,
): Promise<string> {
  const header = b64url(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: TEST_KID }),
  );
  const payload = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
}

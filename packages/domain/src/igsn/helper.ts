export function normalizeIgsn(value: string): string {
  return value.trim().toUpperCase();
}

// Web Crypto exists in Node 19+ and browsers; domain's tsconfig lib is ES-only, so declare the one method we use.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

// Crockford base32: no I, L, O, U, so hand-retyped IGSNs avoid 0/O and 1/I/L mixups.
const SUFFIX_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SUFFIX_LENGTH = 12;

// Collision-resistant, not collision-proof: the DB unique index is the guarantee.
export function generateIgsnSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH));
  // 256 % 32 === 0, so the modulo introduces no bias.
  return Array.from(bytes, (byte) => SUFFIX_ALPHABET[byte % 32]).join("");
}

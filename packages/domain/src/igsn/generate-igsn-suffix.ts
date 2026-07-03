// Crockford base32: no I, L, O, U, so hand-retyped IGSNs avoid 0/O and 1/I/L mixups.
const SUFFIX_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// 128 uuid bits / 5 bits per char, rounded up.
const SUFFIX_LENGTH = 26;

const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Deterministic: the suffix encodes the sample id bijectively, so two samples
// can never share a suffix and the sample is recoverable from its IGSN.
export function generateIgsnSuffix(sampleId: string): string {
  if (!UUID_PATTERN.test(sampleId)) {
    throw new Error(`Invalid sample id: expected a UUID, got "${sampleId}"`);
  }
  let value = BigInt(`0x${sampleId.replaceAll("-", "")}`);
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix = SUFFIX_ALPHABET[Number(value % 32n)] + suffix;
    value /= 32n;
  }
  return suffix;
}

const SUFFIX_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SUFFIX_LENGTH = 26;

const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

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

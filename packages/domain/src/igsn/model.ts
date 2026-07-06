import { z } from "zod";

// Crockford base32, as produced by generateIgsnSuffix: no I, L, O, U.
const IGSN_SUFFIX_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

const INVALID_IGSN_SUFFIX_MESSAGE =
  "Invalid IGSN suffix: expected 26 Crockford base32 characters";

export const igsnSuffixSchema = z
  .string()
  .trim()
  .regex(IGSN_SUFFIX_PATTERN, INVALID_IGSN_SUFFIX_MESSAGE)
  .toUpperCase();

export type IgsnSuffix = z.infer<typeof igsnSuffixSchema>;

import { z } from "zod";

// Crockford base32, as produced by generateIgsnSuffix: no I, L, O, U.
const SUFFIX_SOURCE = "[0-9A-HJKMNP-TV-Z]{26}";

const IGSN_SUFFIX_PATTERN = new RegExp(`^${SUFFIX_SOURCE}$`, "i");
const IGSN_PATTERN = new RegExp(`^10\\.\\d{4,9}/${SUFFIX_SOURCE}$`, "i");

const INVALID_IGSN_SUFFIX_MESSAGE =
  "Invalid IGSN suffix: expected 26 Crockford base32 characters";

const INVALID_IGSN_MESSAGE =
  "Invalid IGSN: expected 10.<registrant>/<26-char Crockford base32 suffix>";

export const igsnSuffixSchema = z
  .string()
  .trim()
  .regex(IGSN_SUFFIX_PATTERN, INVALID_IGSN_SUFFIX_MESSAGE)
  .toUpperCase();

export type IgsnSuffix = z.infer<typeof igsnSuffixSchema>;

export const igsnSchema = z
  .string()
  .trim()
  .regex(IGSN_PATTERN, INVALID_IGSN_MESSAGE)
  .toUpperCase();

export type Igsn = z.infer<typeof igsnSchema>;

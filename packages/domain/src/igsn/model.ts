import { z } from "zod";

const IGSN_SUFFIX_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

const INVALID_IGSN_SUFFIX_MESSAGE =
  "Invalid IGSN suffix: expected 26 Crockford base32 characters";

export const igsnSuffixSchema = z
  .string()
  .trim()
  .regex(IGSN_SUFFIX_PATTERN, INVALID_IGSN_SUFFIX_MESSAGE)
  .toUpperCase();

export type IgsnSuffix = z.infer<typeof igsnSuffixSchema>;

// Legacy IGSNs imported from the old registry predate our format. They are
// already published, so already valid.
const legacyIgsnSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(?:CNRS|TOAE)\d{10}$/);

export const igsnSchema = z.union([igsnSuffixSchema, legacyIgsnSchema]);

export type Igsn = z.infer<typeof igsnSchema>;

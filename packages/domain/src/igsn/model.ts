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

// Legacy IGSNs imported from the old registry (e.g. CNRS0000012260, TOAE...)
// predate our format: an uppercase alphanumeric identifier, no Crockford
// restriction. They are already published, so already valid.
const legacyIgsnSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-Z]{4,64}$/);

// A stored/looked-up IGSN is either one we minted (strict suffix) or a legacy
// identifier. Minting a new IGSN stays strict (igsnSuffixSchema); this laxer
// schema is only for reading and lookup, so legacy samples are treated no
// differently from natively-minted ones.
export const igsnSchema = z.union([igsnSuffixSchema, legacyIgsnSchema]);

export type Igsn = z.infer<typeof igsnSchema>;

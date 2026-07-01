import { z } from "zod";

import { normalizeIgsn } from "./helper";

const IGSN_PATTERN = /^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;

const INVALID_IGSN_MESSAGE =
  "Invalid IGSN: expected a DOI like 10.<registrant>/<suffix>";

export const igsnSchema = z
  .string()
  .trim()
  .regex(IGSN_PATTERN, INVALID_IGSN_MESSAGE)
  .transform(normalizeIgsn);

export type Igsn = z.infer<typeof igsnSchema>;

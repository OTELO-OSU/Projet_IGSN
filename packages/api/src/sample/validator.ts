import { igsnSuffixSchema } from "@projet-igsn/domain/igsn/model";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

const idParamSchema = z.object({ id: z.uuid() });

const igsnParamSchema = z.object({ igsn: igsnSuffixSchema });

// A malformed uuid can match no sample, and unvalidated it would make the
// uuid-typed query throw, so reject it up front rather than 500 later.
export const validateIdParam = validator("param", (value, c) => {
  const parsed = idParamSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid sample id" }, 400);
  }
  return parsed.data;
});

// A malformed IGSN can match no sample; reject it up front rather than 500 on
// the query. Only published samples carry an IGSN, so this is the public lookup.
export const validateIgsnParam = validator("param", (value, c) => {
  const parsed = igsnParamSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid IGSN" }, 400);
  }
  return parsed.data;
});

export const validateListQuery = validator("query", (value, c) => {
  const parsed = listSamplesQuerySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return parsed.data;
});

export const validateCreateSampleBody = validator("json", (value, c) => {
  const parsed = createSampleSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid sample" }, 400);
  }
  return parsed.data;
});

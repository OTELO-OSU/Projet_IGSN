import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

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

// A malformed uuid can match no sample, and unvalidated it would make the
// uuid-typed query throw, so answer 404 rather than 500.
export const validateIdParam = validator("param", (value, c) => {
  const parsed = z.object({ id: z.uuid() }).safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Not found" }, 404);
  }
  return parsed.data;
});

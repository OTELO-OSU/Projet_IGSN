import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { validator } from "hono/validator";

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

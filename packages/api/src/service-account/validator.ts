import {
  listServiceAccountsQuerySchema,
  serviceAccountBodySchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import { validator } from "hono/validator";

import { validateUuidIdParam } from "../uuid-param.ts";

export const validateServiceAccountIdParam = validateUuidIdParam(
  "Invalid service account id",
);

export const validateListServiceAccountsQuery = validator(
  "query",
  (value, c) => {
    const parsed = listServiceAccountsQuerySchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }
    return parsed.data;
  },
);

export const validateServiceAccountBody = validator("json", (value, c) => {
  const parsed = serviceAccountBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid service account" }, 400);
  }
  return parsed.data;
});

import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import {
  listServiceAccountsQuerySchema,
  serviceAccountBodySchema,
  serviceAccountRequestSchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import {
  type InvalidServiceSample,
  createServiceSampleSchema,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import { validator } from "hono/validator";
import { z } from "zod";

import { validateUuidIdParam } from "../uuid-param.ts";
import { zodValidator } from "../zod-validator.ts";
import { serviceSampleIssue } from "./service-sample-issue.ts";

export const validateCreateServiceSampleBody = validator("json", (value, c) => {
  const parsed = createServiceSampleSchema.safeParse(value);
  if (!parsed.success) {
    const body: InvalidServiceSample = {
      error: "Invalid sample",
      issues: parsed.error.issues.map(({ path, code, message }) =>
        serviceSampleIssue(code, path, message),
      ),
    };
    return c.json(body, 422);
  }
  return parsed.data;
});

export const validateServiceAccountIdParam = validateUuidIdParam(
  "Invalid service account id",
);

export const validateListServiceAccountsQuery = zodValidator(
  "query",
  listServiceAccountsQuerySchema,
  "Invalid query parameters",
);

export const validateServiceAccountBody = zodValidator(
  "json",
  serviceAccountBodySchema,
  "Invalid service account",
);

export const validateServiceAccountRequestBody = zodValidator(
  "json",
  serviceAccountRequestSchema,
  "Invalid service account request",
);

export const validateListServiceSamplesQuery = zodValidator(
  "query",
  listSamplesQuerySchema.pick({ page: true, perPage: true }).extend({
    editable: z.stringbool().optional().catch(undefined),
  }),
  "Invalid query parameters",
);

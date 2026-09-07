import {
  listServiceAccountsQuerySchema,
  serviceAccountBodySchema,
} from "@projet-igsn/domain/service-account/service-account-validator";

import { validateUuidIdParam } from "../uuid-param.ts";
import { zodValidator } from "../zod-validator.ts";

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

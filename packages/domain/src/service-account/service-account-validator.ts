import { z } from "zod";

import {
  DEFAULT_PAGE_SIZE,
  pageSchema,
  pageSizeSchema,
  requestReasonSchema,
} from "../sample/sample-validator.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";
import { userIdentitySchema } from "../user/user-validator.ts";
import { myServiceAccountSchema, serviceAccountSchema } from "./model.ts";

const MAX_NAME_LENGTH = 100;

const serviceAccountNameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const serviceAccountBodySchema = z.strictObject({
  name: serviceAccountNameSchema,
  ownerId: z.uuid(),
  sampleOwnerId: z.uuid(),
  managedGroups: managedGroupsSchema,
});

export type ServiceAccountBody = z.infer<typeof serviceAccountBodySchema>;

export const serviceAccountRequestSchema = z.strictObject({
  name: serviceAccountNameSchema,
  sampleOwnerId: z.uuid(),
  managedGroups: managedGroupsSchema,
  reason: requestReasonSchema,
});

export type ServiceAccountRequest = z.infer<typeof serviceAccountRequestSchema>;

const requestableInstitutionalGroupsSchema = z.object({
  organizations: z.array(z.string()),
  osus: z.array(z.string()),
  laboratories: z.array(z.string()),
});

export type RequestableInstitutionalGroups = z.infer<
  typeof requestableInstitutionalGroupsSchema
>;

export const requestableInstitutionalGroupsResponseSchema = z.object({
  data: requestableInstitutionalGroupsSchema,
});

export type RequestableInstitutionalGroupsResponse = z.infer<
  typeof requestableInstitutionalGroupsResponseSchema
>;

export const serviceAccountDraftSchema = z.object({
  name: z.string(),
  managedGroups: managedGroupsSchema,
  owner: userIdentitySchema.nullable(),
  sampleOwner: userIdentitySchema.nullable(),
});

export type ServiceAccountDraft = z.infer<typeof serviceAccountDraftSchema>;

export const listServiceAccountsQuerySchema = z.object({
  page: pageSchema,
  perPage: pageSizeSchema(DEFAULT_PAGE_SIZE),
});

export type ListServiceAccountsQuery = z.infer<
  typeof listServiceAccountsQuerySchema
>;

export const serviceAccountResponseSchema = z.object({
  data: serviceAccountSchema,
});

export type ServiceAccountResponse = z.infer<
  typeof serviceAccountResponseSchema
>;

export const listServiceAccountsResponseSchema = z.object({
  data: z.array(serviceAccountSchema),
  meta: z.object({ total: z.number() }),
});

export type ListServiceAccountsResponse = z.infer<
  typeof listServiceAccountsResponseSchema
>;

export const myServiceAccountsResponseSchema = z.object({
  data: z.array(myServiceAccountSchema),
});

export type MyServiceAccountsResponse = z.infer<
  typeof myServiceAccountsResponseSchema
>;

export const apiKeyResponseSchema = z.object({ apiKey: z.string() });

export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;

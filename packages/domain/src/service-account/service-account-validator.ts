import { z } from "zod";

import { setInstitutionalGroupsSchema } from "../institutional-group/institutional-groups-validator.ts";
import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
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

export const serviceAccountBodySchema = setInstitutionalGroupsSchema.safeExtend(
  {
    name: serviceAccountNameSchema,
    ownerId: z.uuid(),
    institutionalOsu: osuCodeSchema.nullable().default(null),
    managedGroups: managedGroupsSchema,
  },
);

export type ServiceAccountBody = z.infer<typeof serviceAccountBodySchema>;

export const serviceAccountRequestSchema = z.strictObject({
  name: serviceAccountNameSchema,
  managedGroups: managedGroupsSchema,
  reason: requestReasonSchema,
});

export type ServiceAccountRequest = z.infer<typeof serviceAccountRequestSchema>;

export const serviceAccountDraftSchema = z.object({
  name: z.string(),
  ...institutionalGroupsFields,
  managedGroups: managedGroupsSchema,
  owner: userIdentitySchema.nullable(),
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

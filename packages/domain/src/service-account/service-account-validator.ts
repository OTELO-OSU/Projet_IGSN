import { z } from "zod";

import { setInstitutionalGroupsSchema } from "../institutional-group/institutional-groups-validator.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import {
  DEFAULT_PAGE_SIZE,
  pageSchema,
  pageSizeSchema,
} from "../sample/sample-validator.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";
import { serviceAccountSchema } from "./model.ts";

const MAX_NAME_LENGTH = 100;

export const serviceAccountBodySchema = setInstitutionalGroupsSchema.safeExtend(
  {
    name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    institutionalOsu: osuCodeSchema.nullable().default(null),
    managedGroups: managedGroupsSchema,
  },
);

export type ServiceAccountBody = z.infer<typeof serviceAccountBodySchema>;

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

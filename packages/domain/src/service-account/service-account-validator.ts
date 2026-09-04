import { z } from "zod";

import { institutionalGroupIssues } from "../institutional-group/institutional-groups-validator.ts";
import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import {
  DEFAULT_PAGE_SIZE,
  pageSizeSchema,
} from "../sample/sample-validator.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";
import { serviceAccountSchema } from "./model.ts";

const MAX_NAME_LENGTH = 100;

export const serviceAccountBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    institutionalOrganization: organizationRorSchema,
    institutionalOsu: osuCodeSchema.nullable(),
    institutionalLaboratory: laboratoryCodeSchema,
    managedGroups: managedGroupsSchema,
  })
  .superRefine((account, ctx) => {
    for (const issue of institutionalGroupIssues(account)) {
      ctx.addIssue({
        code: "custom",
        path: [issue.path],
        message: issue.message,
      });
    }
  });

export type ServiceAccountBody = z.infer<typeof serviceAccountBodySchema>;

export const listServiceAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
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

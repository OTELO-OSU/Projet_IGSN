import { z } from "zod";

import { optionalInstitutionalGroupIssues } from "../institutional-group/institutional-groups-validator.ts";
import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import { manualGroupSchema } from "../manual-group/model.ts";
import {
  DEFAULT_PAGE_SIZE,
  pageSizeSchema,
} from "../sample/sample-validator.ts";
import { managedGroupsSchema } from "./managed-groups.ts";
import { userSchema, userStatusSchema } from "./model.ts";

export const userIdentitySchema = userSchema.pick({
  id: true,
  email: true,
  name: true,
  firstname: true,
  orcid: true,
});

export type UserIdentity = z.infer<typeof userIdentitySchema>;

export const userIdentitiesResponseSchema = z.object({
  data: z.array(userIdentitySchema),
});

export type UserIdentitiesResponse = z.infer<
  typeof userIdentitiesResponseSchema
>;

export const publicUserSchema = userSchema.pick({
  id: true,
  name: true,
  firstname: true,
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const publicUsersResponseSchema = z.object({
  data: z.array(publicUserSchema),
});

export type PublicUsersResponse = z.infer<typeof publicUsersResponseSchema>;

export const listContributorsQuerySchema = z.object({
  include: z.uuid().optional().catch(undefined),
});

export type ListContributorsQuery = z.infer<typeof listContributorsQuerySchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: pageSizeSchema(DEFAULT_PAGE_SIZE),
  status: userStatusSchema.optional().catch(undefined),
  institutionalOrganization: organizationRorSchema.optional().catch(undefined),
  institutionalOsu: osuCodeSchema.optional().catch(undefined),
  institutionalLaboratory: laboratoryCodeSchema.optional().catch(undefined),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const adminUserSchema = userSchema.extend({
  manualGroups: z.array(manualGroupSchema.extend({ canDetach: z.boolean() })),
  managedGroups: managedGroupsSchema,
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminUserResponseSchema = z.object({ data: adminUserSchema });

export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;

export const listedUserSchema = adminUserSchema.omit({
  managedGroups: true,
});

export type ListedUser = z.infer<typeof listedUserSchema>;

export const listUsersResponseSchema = z.object({
  data: z.array(listedUserSchema),
  meta: z.object({ total: z.number() }),
});

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;

export const updateUserSchema = z
  .strictObject({
    status: userStatusSchema,
    institutionalOrganization: organizationRorSchema.nullable(),
    institutionalOsu: osuCodeSchema.nullable(),
    institutionalLaboratory: laboratoryCodeSchema.nullable(),
    manualGroupIds: z.array(z.uuid()),
    managedGroups: managedGroupsSchema,
  })
  .superRefine((user, ctx) => {
    for (const issue of optionalInstitutionalGroupIssues(user)) {
      ctx.addIssue({
        code: "custom",
        path: [issue.path],
        message: issue.message,
      });
    }
  });

export type UpdateUser = z.infer<typeof updateUserSchema>;

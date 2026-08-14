import { z } from "zod";

import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import {
  DEFAULT_PAGE_SIZE,
  pageSizeSchema,
} from "../sample/sample-validator.ts";
import { userSchema, userStatusSchema } from "./model.ts";

// Identity fields only: collaborator search is served to any authenticated
// user, so moderation state (status, superAdmin) stays out of it.
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

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: pageSizeSchema(DEFAULT_PAGE_SIZE),
  status: userStatusSchema.optional().catch(undefined),
  institutionalOrganization: organizationRorSchema.optional().catch(undefined),
  institutionalOsu: osuCodeSchema.optional().catch(undefined),
  institutionalLaboratory: laboratoryCodeSchema.optional().catch(undefined),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const listUsersResponseSchema = z.object({
  data: z.array(userSchema),
  meta: z.object({ total: z.number() }),
});

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;

export const userResponseSchema = z.object({ data: userSchema });

export type UserResponse = z.infer<typeof userResponseSchema>;

// Moderation only ever sets a decision: "pending" is the initial state, not a
// state an admin puts a user back into.
export const setUserStatusBodySchema = z.strictObject({
  status: userStatusSchema.exclude(["pending"]),
});

export type SetUserStatusBody = z.infer<typeof setUserStatusBodySchema>;

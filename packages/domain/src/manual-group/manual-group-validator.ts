import { z } from "zod";

import {
  DEFAULT_PAGE_SIZE,
  pageSizeSchema,
} from "../sample/sample-validator.ts";
import { MAX_SEARCH_LENGTH } from "../sample/search/search-tokens.ts";
import { userStatusSchema } from "../user/model.ts";
import { userIdentitySchema } from "../user/user-validator.ts";
import { manualGroupNameSchema, manualGroupSchema } from "./model.ts";

export const manualGroupNameBodySchema = z.strictObject({
  name: manualGroupNameSchema,
});

export type ManualGroupNameBody = z.infer<typeof manualGroupNameBodySchema>;

export const addManualGroupMemberBodySchema = z.strictObject({
  userId: z.uuid(),
});

export type AddManualGroupMemberBody = z.infer<
  typeof addManualGroupMemberBodySchema
>;

export const listManualGroupsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  perPage: pageSizeSchema(DEFAULT_PAGE_SIZE),
  search: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_SEARCH_LENGTH))
    .optional()
    .catch(undefined),
});

export type ListManualGroupsQuery = z.infer<typeof listManualGroupsQuerySchema>;

export const manualGroupListItemSchema = manualGroupSchema.extend({
  memberCount: z.number(),
});

export type ManualGroupListItem = z.infer<typeof manualGroupListItemSchema>;

export const manualGroupMemberSchema = userIdentitySchema.extend({
  status: userStatusSchema,
});

export type ManualGroupMember = z.infer<typeof manualGroupMemberSchema>;

export const listManualGroupsResponseSchema = z.object({
  data: z.array(manualGroupListItemSchema),
  meta: z.object({ total: z.number() }),
});

export type ListManualGroupsResponse = z.infer<
  typeof listManualGroupsResponseSchema
>;

export const manualGroupResponseSchema = z.object({ data: manualGroupSchema });

export type ManualGroupResponse = z.infer<typeof manualGroupResponseSchema>;

export const manualGroupMembersResponseSchema = z.object({
  data: z.array(manualGroupMemberSchema),
});

export type ManualGroupMembersResponse = z.infer<
  typeof manualGroupMembersResponseSchema
>;

export const myManualGroupsResponseSchema = z.object({
  data: z.array(manualGroupSchema),
  meta: z.object({ canLeave: z.boolean() }),
});

export type MyManualGroupsResponse = z.infer<
  typeof myManualGroupsResponseSchema
>;

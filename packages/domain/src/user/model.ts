import { z } from "zod";

import { institutionalGroupsFields } from "../institutional-group/model.ts";

export const USER_STATUSES = ["pending", "accepted", "rejected"] as const;

export const userStatusSchema = z.enum(USER_STATUSES);

export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string().nullable(),
  firstname: z.string().nullable(),
  orcid: z.string().nullable(),
  status: userStatusSchema,
  superAdmin: z.boolean(),
  ...institutionalGroupsFields,
});

export type User = z.infer<typeof userSchema>;

import { z } from "zod";

import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";
import { userIdentitySchema } from "../user/user-validator.ts";

export const serviceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  ...institutionalGroupsFields,
  managedGroups: managedGroupsSchema,
  owner: userIdentitySchema,
  sampleOwner: userIdentitySchema,
  hasApiKey: z.boolean(),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export const myServiceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  hasApiKey: z.boolean(),
});

export type MyServiceAccount = z.infer<typeof myServiceAccountSchema>;

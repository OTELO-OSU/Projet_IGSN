import { z } from "zod";

import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";
import { userIdentitySchema } from "../user/user-validator.ts";

export const serviceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionalOrganization: organizationRorSchema,
  institutionalOsu: osuCodeSchema.nullable(),
  institutionalLaboratory: laboratoryCodeSchema,
  managedGroups: managedGroupsSchema,
  owner: userIdentitySchema,
  hasApiKey: z.boolean(),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export const myServiceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  hasApiKey: z.boolean(),
});

export type MyServiceAccount = z.infer<typeof myServiceAccountSchema>;

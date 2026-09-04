import { z } from "zod";

import { laboratoryCodeSchema } from "../institutional-group/laboratory.ts";
import { organizationRorSchema } from "../institutional-group/organization.ts";
import { osuCodeSchema } from "../institutional-group/osu.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";

export const serviceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionalOrganization: organizationRorSchema,
  institutionalOsu: osuCodeSchema.nullable(),
  institutionalLaboratory: laboratoryCodeSchema,
  managedGroups: managedGroupsSchema,
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export const listedServiceAccountSchema = serviceAccountSchema.omit({
  managedGroups: true,
});

export type ListedServiceAccount = z.infer<typeof listedServiceAccountSchema>;

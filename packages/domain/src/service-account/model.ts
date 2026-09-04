import { z } from "zod";

import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { managedGroupsSchema } from "../user/managed-groups.ts";

export const serviceAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  ...institutionalGroupsFields,
  managedGroups: managedGroupsSchema,
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

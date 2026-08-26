import { z } from "zod";

import { institutionalGroupsFields } from "../institutional-group/model.ts";
import { manualGroupSchema } from "../manual-group/model.ts";
import { userStatusSchema } from "./model.ts";

export const currentUserSchema = z.object({
  id: z.uuid(),
  sub: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  orcid: z.string().nullable(),
  status: userStatusSchema,
  superAdmin: z.boolean(),
  managedLaboratories: z.array(z.string()),
  managedManualGroups: z.array(manualGroupSchema),
  ...institutionalGroupsFields,
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

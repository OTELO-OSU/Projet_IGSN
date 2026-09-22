import { z } from "zod";

export const ADDITIONAL_ROLES = [
  "researcher",
  "project_manager",
  "project_member",
  "data_manager",
] as const;

export const additionalRoleSchema = z.enum(ADDITIONAL_ROLES);

export type AdditionalRole = z.infer<typeof additionalRoleSchema>;

import type { AdditionalRole } from "../additional-role/role.ts";
import type { CoreRole } from "./core-sample-schema.ts";

export const CORE_ROLE_BY_ADDITIONAL_ROLE = {
  researcher: "Researcher",
  project_manager: "ProjectManager",
  project_member: "ProjectMember",
  data_manager: "DataManager",
} as const satisfies Record<AdditionalRole, CoreRole>;

export const ADDITIONAL_ROLE_BY_CORE_ROLE = Object.fromEntries(
  Object.entries(CORE_ROLE_BY_ADDITIONAL_ROLE).map(([role, coreRole]) => [
    coreRole,
    role,
  ]),
) as Partial<Record<CoreRole, AdditionalRole>>;

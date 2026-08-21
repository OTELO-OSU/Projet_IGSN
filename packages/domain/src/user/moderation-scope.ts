import type { ManagedGroups } from "./managed-groups.ts";

import { managedLaboratoryCodes } from "./managed-laboratory-codes.ts";

export type ModerationScope = {
  callerId: string;
  superAdmin: boolean;
  managedLaboratories: string[];
  managedManualGroupIds: string[];
};

export const superAdminScope = (callerId: string): ModerationScope => ({
  callerId,
  superAdmin: true,
  managedLaboratories: [],
  managedManualGroupIds: [],
});

export const managerScope = (
  callerId: string,
  groups: ManagedGroups,
): ModerationScope => ({
  callerId,
  superAdmin: false,
  managedLaboratories: managedLaboratoryCodes(groups),
  managedManualGroupIds: groups.manualGroupIds,
});

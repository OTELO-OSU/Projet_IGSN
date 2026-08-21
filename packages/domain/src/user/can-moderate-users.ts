import type { CurrentUser } from "./current-user.ts";

export function canModerateUsers(me: CurrentUser): boolean {
  return (
    me.superAdmin ||
    me.managedLaboratories.length > 0 ||
    me.managedManualGroups.length > 0
  );
}

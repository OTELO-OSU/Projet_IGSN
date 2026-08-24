import type { CurrentUser } from "./current-user.ts";

export function canAdminManualGroups(
  me: Pick<
    CurrentUser,
    "superAdmin" | "managedLaboratories" | "managedManualGroups"
  >,
): boolean {
  return (
    me.superAdmin ||
    me.managedLaboratories.length > 0 ||
    me.managedManualGroups.length > 0
  );
}

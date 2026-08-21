import type { CurrentUser } from "./current-user.ts";

export function canAdminManualGroups(me: CurrentUser): boolean {
  return me.superAdmin || me.managedManualGroups.length > 0;
}

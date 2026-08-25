import type { CurrentUser } from "./current-user.ts";

import { canAdminManualGroups } from "./can-admin-manual-groups.ts";
import { canModerateUsers } from "./can-moderate-users.ts";

export function canModerateSamples(me: CurrentUser): boolean {
  return canModerateUsers(me) || canAdminManualGroups(me);
}

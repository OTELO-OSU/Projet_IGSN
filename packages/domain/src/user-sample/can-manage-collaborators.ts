import type { UserSampleRole } from "./model.ts";

import { isSampleOwner } from "./is-sample-owner.ts";

export function canManageCollaborators(role: UserSampleRole | null): boolean {
  return isSampleOwner(role);
}

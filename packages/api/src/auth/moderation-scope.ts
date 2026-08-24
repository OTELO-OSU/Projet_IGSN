import type { User } from "@projet-igsn/domain/user/model";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { isSpaceManager } from "@projet-igsn/domain/user/is-space-manager";
import {
  managerScope,
  superAdminScope,
} from "@projet-igsn/domain/user/moderation-scope";

export async function getModerationScope(
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
): Promise<ModerationScope | null> {
  if (user.superAdmin) {
    return superAdminScope(user.id);
  }
  const groups = await users.getModerationScope(user.id);
  if (!isSpaceManager(groups)) {
    return null;
  }
  return managerScope(user.id, groups);
}

import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";

import { inModerationReach } from "./require-sample-access.ts";

export async function findEligibleParent(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  parentId: string,
): Promise<Sample | null> {
  const found = await repository.get(parentId, user.id);
  if (!found) return null;
  const managed = await inModerationReach(repository, users, user, parentId);
  return canDeclareSubSample(found.sample, { role: found.role, managed })
    ? found.sample
    : null;
}

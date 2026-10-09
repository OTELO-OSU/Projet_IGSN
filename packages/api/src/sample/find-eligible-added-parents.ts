import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { diffParentIds } from "@projet-igsn/domain/sample/parent/diff-parent-ids";

import { findEligibleParent } from "./find-eligible-parent.ts";

export async function findEligibleAddedParents(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  current: Pick<Sample, "parents">,
  parentIds: readonly string[] | undefined,
): Promise<Sample[] | null> {
  const added = await Promise.all(
    diffParentIds(current.parents, parentIds).added.map((parentId) =>
      findEligibleParent(repository, users, user, parentId),
    ),
  );
  return added.includes(null)
    ? null
    : added.filter((parent) => parent !== null);
}

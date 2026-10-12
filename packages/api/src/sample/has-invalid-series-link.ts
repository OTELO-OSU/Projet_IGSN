import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";

import { getModerationScope } from "../auth/moderation-scope.ts";
import { canEditCandidate } from "./can-edit-candidate.ts";
import { isEligibleChild } from "./is-eligible-child.ts";

export async function hasInvalidSeriesLink(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  { childIds = [], type }: Pick<CreateSample, "childIds" | "type">,
  current: Pick<Sample, "id" | "children">,
): Promise<boolean> {
  const stored = current.children.map(({ id }) => id);
  const added = childIds.filter((id) => !stored.includes(id));
  const toSeries = isVirtualSample(type);
  if (!toSeries && added.length === 0) return false;
  const candidates = await repository.listSeriesLinkCandidates(
    [current.id, ...added],
    user.id,
    added.length > 0 ? await getModerationScope(users, user) : null,
  );
  if (toSeries && candidates.get(current.id)?.seriesId) return true;
  return added.some((childId) => {
    const child = candidates.get(childId);
    return (
      child === undefined ||
      !canEditCandidate(user, child) ||
      !isEligibleChild(child, current.id)
    );
  });
}

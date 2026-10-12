import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { canJoinSeries } from "@projet-igsn/domain/sample/publication/can-join-series";

import { getModerationScope } from "../auth/moderation-scope.ts";
import { canEditCandidate } from "./can-edit-candidate.ts";
import { isEligibleSeries } from "./is-eligible-series.ts";

export async function isJoinableSeries(
  repository: SampleRepository,
  users: UserRepository,
  user: Pick<User, "id" | "superAdmin">,
  seriesId: string,
  member: Sample,
): Promise<boolean> {
  const series = (
    await repository.listSeriesLinkCandidates(
      [seriesId],
      user.id,
      await getModerationScope(users, user),
    )
  ).get(seriesId);
  return (
    series !== undefined &&
    canJoinSeries(member) &&
    isEligibleSeries(series) &&
    canEditCandidate(user, series)
  );
}

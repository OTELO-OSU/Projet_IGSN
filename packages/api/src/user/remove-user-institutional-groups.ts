import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Transaction } from "kysely";

import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";

import type { DB } from "../db.ts";

import { lockUserInScope } from "./lock-user-in-scope.ts";
import { orphanedGroupsOnLeavingAccepted } from "./orphaned-groups-of-user.ts";

export async function removeUserInstitutionalGroups(
  trx: Transaction<DB>,
  id: string,
  scope: ModerationScope,
): ReturnType<UserRepository["removeInstitutionalGroups"]> {
  const previous = await lockUserInScope(trx, id, scope);
  const status = shouldRePendOnInstitutionsUpdate(previous, null)
    ? "pending"
    : previous.status;
  await trx
    .updateTable("user")
    .set({
      status,
      institutional_organization: null,
      institutional_osu: null,
      institutional_laboratory: null,
    })
    .where("id", "=", id)
    .execute();
  return {
    previousStatus: previous.status,
    status,
    orphanedGroups: await orphanedGroupsOnLeavingAccepted(
      trx,
      id,
      previous.status,
      status,
    ),
  };
}

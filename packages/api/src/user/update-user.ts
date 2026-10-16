import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import { canBecomeSuperAdmin } from "@projet-igsn/domain/user/can-become-super-admin";
import { canSetSuperAdmin } from "@projet-igsn/domain/user/can-set-super-admin";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { storedInstitutions } from "../institutional-group/stored-institution.ts";
import {
  replaceManagedGroups,
  USER_MANAGED_GROUP_TABLES,
} from "../managed-groups.ts";
import { lockUserInScope } from "./lock-user-in-scope.ts";
import { orphanedGroupsOnLeavingAccepted } from "./orphaned-groups-of-user.ts";
import { updateUserStatusAndInstitutions } from "./update-user-status-and-institutions.ts";
import { upsertUserManualGroups } from "./upsert-user-manual-groups.ts";
import {
  toAdminUser,
  USER_COLUMNS,
  userManagedGroups,
  userManualGroups,
} from "./user-columns.ts";

export async function updateUser(
  trx: Transaction<DB>,
  id: string,
  submitted: UpdateUser,
  scope: ModerationScope,
): ReturnType<UserRepository["update"]> {
  const previous = await lockUserInScope(trx, id, scope);
  const rights = userManagementRights(scope, previous);
  const user = updateUserStatusAndInstitutions(submitted, previous, rights);
  const superAdmin =
    canSetSuperAdmin(scope, id) && submitted.superAdmin !== undefined
      ? submitted.superAdmin
      : previous.superAdmin;
  if (superAdmin && !previous.superAdmin && !canBecomeSuperAdmin(user.status)) {
    throw new HTTPException(422, {
      message: "Only an accepted user can become super admin",
    });
  }
  const { joined, leftIds } = await upsertUserManualGroups(
    trx,
    id,
    submitted.manualGroupIds,
    user.status,
    scope,
  );
  if (rights.managedGroups) {
    await replaceManagedGroups(
      trx,
      USER_MANAGED_GROUP_TABLES,
      id,
      submitted.managedGroups,
    );
  }
  const stored = storedInstitutions(user);
  await trx
    .updateTable("user")
    .set({
      status: stored.status,
      super_admin: superAdmin,
      institutional_organization: stored.institutionalOrganization,
      institutional_osu: stored.institutionalOsu,
      institutional_laboratory: stored.institutionalLaboratory,
    })
    .where("id", "=", id)
    .execute();

  const { mailOptOuts, ...row } = await trx
    .selectFrom("user")
    .select(USER_COLUMNS)
    .select(userManualGroups)
    .select(userManagedGroups)
    .select("mail_opt_outs as mailOptOuts")
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
  return {
    user: toAdminUser(row),
    mailOptOuts,
    previousStatus: previous.status,
    previousSuperAdmin: previous.superAdmin,
    joinedGroups: joined,
    leftGroupIds: leftIds,
    orphanedGroups: await orphanedGroupsOnLeavingAccepted(
      trx,
      id,
      previous.status,
      user.status,
    ),
  };
}

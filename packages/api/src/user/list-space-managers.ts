import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Transaction } from "kysely";

import { isSpaceManager } from "@projet-igsn/domain/user/is-space-manager";

import type { DB } from "../db.ts";

import { knownManagedGroupCodes } from "../managed-groups.ts";
import { userManagedGroups } from "./user-columns.ts";

// ponytail: reads every accepted row to filter managers in JS; prefilter on the two managed tables in SQL if it grows.
export async function listSpaceManagers(
  trx: Transaction<DB>,
): ReturnType<UserRepository["listSpaceManagers"]> {
  const rows = await trx
    .selectFrom("user")
    .select(["id", "email"])
    .select(userManagedGroups)
    .where("status", "=", "accepted")
    .where("super_admin", "=", false)
    .where((eb) =>
      eb.not(
        eb(eb.val("pending_users_digest"), "=", eb.fn.any("mail_opt_outs")),
      ),
    )
    .orderBy("email", "asc")
    .execute();
  return rows
    .map(({ id, email, managedGroups: groups }) => ({
      id,
      email,
      groups: knownManagedGroupCodes(groups),
    }))
    .filter(({ groups }) => isSpaceManager(groups));
}

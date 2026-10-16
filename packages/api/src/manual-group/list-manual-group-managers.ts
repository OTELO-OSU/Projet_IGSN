import type { GroupManager } from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import { groupManagerSchema } from "@projet-igsn/domain/user/user-validator";

import type { DB } from "../db.ts";

export async function listManualGroupManagers(
  trx: Transaction<DB>,
  id: string,
): Promise<GroupManager[]> {
  const rows = await trx
    .selectFrom("user_managed_manual_group")
    .innerJoin("user", "user.id", "user_managed_manual_group.user_id")
    .select([
      "user.id",
      "user.email",
      "user.name",
      "user.firstname",
      "user.orcid",
      "user.status",
    ])
    .where("user_managed_manual_group.group_id", "=", id)
    .orderBy("user.email", "asc")
    .execute();
  return rows.map((row) => groupManagerSchema.parse(row));
}

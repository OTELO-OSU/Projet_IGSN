import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { Transaction } from "kysely";

import { MANAGED_GROUP_KINDS } from "@projet-igsn/domain/user/managed-groups";

import type { DB } from "../db.ts";

export async function upsertUserManagedGroups(
  trx: Transaction<DB>,
  userId: string,
  groups: ManagedGroups,
): Promise<void> {
  const rows = MANAGED_GROUP_KINDS.flatMap(([key, kind]) =>
    groups[key].map((code) => ({ user_id: userId, kind, code })),
  );

  await trx
    .deleteFrom("user_managed_institutional_group")
    .where("user_id", "=", userId)
    .execute();
  if (rows.length > 0) {
    await trx
      .insertInto("user_managed_institutional_group")
      .values(rows)
      .execute();
  }
}

import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { AdminUser } from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import type { DB } from "../db.ts";

import { moderationScopeWhere } from "./moderation-scope-where.ts";
import {
  toAdminUser,
  USER_COLUMNS,
  userManagedGroups,
  userManualGroups,
} from "./user-columns.ts";

export async function getUser(
  trx: Transaction<DB>,
  id: string,
  scope: ModerationScope,
): Promise<AdminUser | null> {
  const row = await trx
    .selectFrom("user")
    .select(USER_COLUMNS)
    .select(userManualGroups)
    .select(userManagedGroups)
    .where("id", "=", id)
    .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
    .executeTakeFirst();
  return row ? toAdminUser(row) : null;
}

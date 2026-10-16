import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Transaction } from "kysely";

import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { institutionCodes } from "../institutional-group/stored-institution.ts";
import { moderationScopeWhere } from "./moderation-scope-where.ts";

// ponytail: one write per admin request; read first and write only on a change if the write volume ever matters.
export const lockUserInScope = async (
  trx: Transaction<DB>,
  id: string,
  scope: ModerationScope,
) => {
  const row = await trx
    .selectFrom("user")
    .select([
      "status",
      "super_admin as superAdmin",
      "institutional_organization as institutionalOrganization",
      "institutional_osu as institutionalOsu",
      "institutional_laboratory as institutionalLaboratory",
    ])
    .where("id", "=", id)
    .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
    .forUpdate()
    .executeTakeFirst();
  if (!row) {
    throw scope.superAdmin
      ? new HTTPException(404, { message: "User not found" })
      : new HTTPException(403, { message: "Forbidden" });
  }
  return institutionCodes(row);
};

import type { PendingUser } from "@projet-igsn/domain/user/repository";
import type { Transaction } from "kysely";

import { laboratoryCodeOf } from "@projet-igsn/domain/institutional-group/laboratory-code-of";

import type { DB } from "../db.ts";

export async function listPendingUsers(
  trx: Transaction<DB>,
): Promise<PendingUser[]> {
  const rows = await trx
    .selectFrom("user")
    .select([
      "email",
      "name",
      "firstname",
      "created_at as createdAt",
      "institutional_laboratory as institutionalLaboratory",
    ])
    .where("status", "=", "pending")
    // TODO: hides a pending super admin from the super admins' own
    // digest too, until the PO says whether a manager may moderate one.
    .where("super_admin", "=", false)
    .orderBy("created_at", "asc")
    .orderBy("email", "asc")
    .execute();
  return rows.map((row) => ({
    ...row,
    institutionalLaboratory:
      row.institutionalLaboratory &&
      laboratoryCodeOf(row.institutionalLaboratory),
  }));
}

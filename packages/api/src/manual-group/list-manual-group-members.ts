import type { ManualGroupMember } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { Transaction } from "kysely";

import { manualGroupMemberSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import type { DB } from "../db.ts";

import { canDetachFromGroup } from "./can-detach-from-group.ts";

export async function listManualGroupMembers(
  trx: Transaction<DB>,
  id: string,
): Promise<ManualGroupMember[]> {
  const rows = await trx
    .selectFrom("manual_group_member")
    .innerJoin("user", "user.id", "manual_group_member.user_id")
    .select((eb) => [
      "user.id",
      "user.email",
      "user.name",
      "user.firstname",
      "user.orcid",
      "user.status",
      canDetachFromGroup(eb.ref("manual_group_member.user_id"), id).as(
        "canDetach",
      ),
    ])
    .where("manual_group_member.group_id", "=", id)
    .orderBy("user.email", "asc")
    .execute();
  return rows.map((row) => manualGroupMemberSchema.parse(row));
}

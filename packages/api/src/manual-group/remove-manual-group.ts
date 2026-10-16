import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { Transaction } from "kysely";

import { PERMANENT_IGSN_STATUSES } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";

import type { DB } from "../db.ts";

import { sampleGroups } from "./manual-group-columns.ts";

export async function removeManualGroup(
  trx: Transaction<DB>,
  id: string,
): ReturnType<ManualGroupRepository["remove"]> {
  const withIgsn = await sampleGroups(trx)
    .select("sample.id")
    .where("sample.status", "in", PERMANENT_IGSN_STATUSES)
    .where("sample_manual_group.group_id", "=", id)
    .limit(1)
    .executeTakeFirst();
  if (withIgsn) {
    return "has_published_sample";
  }
  const { numDeletedRows } = await trx
    .deleteFrom("manual_group")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n ? "removed" : "not_found";
}

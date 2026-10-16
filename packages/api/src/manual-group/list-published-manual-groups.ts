import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { Transaction } from "kysely";

import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";

import type { DB } from "../db.ts";

import { GROUP_COLUMNS, sampleGroups } from "./manual-group-columns.ts";

export async function listPublishedManualGroups(
  trx: Transaction<DB>,
): Promise<ManualGroup[]> {
  const rows = await trx
    .selectFrom("manual_group")
    .select(GROUP_COLUMNS)
    .where(
      "id",
      "in",
      sampleGroups(trx)
        .select("sample_manual_group.group_id")
        .where("sample.status", "=", "published"),
    )
    .orderBy("name", "asc")
    .execute();
  return rows.map((row) => manualGroupSchema.parse(row));
}

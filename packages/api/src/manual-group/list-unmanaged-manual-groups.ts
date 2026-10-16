import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { Transaction } from "kysely";

import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";

import type { DB } from "../db.ts";

import { GROUP_COLUMNS, hasActiveManager } from "./manual-group-columns.ts";

export async function listUnmanagedManualGroups(
  trx: Transaction<DB>,
): Promise<ManualGroup[]> {
  const rows = await trx
    .selectFrom("manual_group")
    .select(GROUP_COLUMNS)
    .where((eb) => eb.not(hasActiveManager(eb)))
    .orderBy("name", "asc")
    .execute();
  return rows.map((row) => manualGroupSchema.parse(row));
}

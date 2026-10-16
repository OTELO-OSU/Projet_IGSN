import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { Transaction } from "kysely";

import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { lockName } from "../unique-name.ts";
import { grantManualGroupManagers } from "./grant-manual-group-managers.ts";
import { GROUP_COLUMNS } from "./manual-group-columns.ts";

export async function createManualGroup(
  trx: Transaction<DB>,
  name: string,
  managerIds: string[],
): ReturnType<ManualGroupRepository["create"]> {
  await lockName(trx, name);
  const row = await trx
    .insertInto("manual_group")
    .values({ id: uuidv7(), name })
    .onConflict((oc) => oc.doNothing())
    .returning(GROUP_COLUMNS)
    .executeTakeFirst();
  if (!row) {
    return "name_taken";
  }
  await grantManualGroupManagers(trx, row.id, managerIds);
  return { group: manualGroupSchema.parse(row) };
}

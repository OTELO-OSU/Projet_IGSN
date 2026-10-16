import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { Transaction } from "kysely";

import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";

import type { DB } from "../db.ts";

import { isNameTakenBy, lockName } from "../unique-name.ts";
import { GROUP_COLUMNS } from "./manual-group-columns.ts";

export async function renameManualGroup(
  trx: Transaction<DB>,
  id: string,
  name: string,
): ReturnType<ManualGroupRepository["rename"]> {
  await lockName(trx, name);
  if (await isNameTakenBy(trx, "manual_group", name, id)) {
    return "name_taken";
  }
  const row = await trx
    .updateTable("manual_group")
    .set({ name })
    .where("id", "=", id)
    .returning(GROUP_COLUMNS)
    .executeTakeFirst();
  return row ? { group: manualGroupSchema.parse(row) } : "not_found";
}

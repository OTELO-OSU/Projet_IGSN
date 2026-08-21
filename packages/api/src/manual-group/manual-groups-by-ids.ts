import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function manualGroupsByIds(
  trx: Transactional<DB>,
  ids: string[],
): Promise<ManualGroup[]> {
  return trx
    .selectFrom("manual_group")
    .select(["id", "name"])
    .where("id", "in", ids)
    .orderBy("name", "asc")
    .execute();
}

export async function assertManualGroupsExist(
  trx: Transactional<DB>,
  ids: string[],
): Promise<ManualGroup[]> {
  if (ids.length === 0) return [];
  const groups = await manualGroupsByIds(trx, ids);
  if (groups.length !== ids.length) {
    throw new HTTPException(404, { message: "Manual group not found" });
  }
  return groups;
}

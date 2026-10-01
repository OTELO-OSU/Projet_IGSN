import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { insertOwnedSample } from "./insert-owned-sample.ts";
import { updateSample } from "./update-sample.ts";

export async function insertPublishingSample(
  trx: Transactional<DB>,
  input: CreateSample,
  ownerId: string,
  groups: InstitutionalGroups,
  internalNumber: number | null,
): Promise<string> {
  const id = await insertOwnedSample(trx, input, ownerId, groups);
  await trx
    .updateTable("sample")
    .set({ status: "publishing", internal_number: internalNumber })
    .where("id", "=", id)
    .execute();
  return id;
}

export async function updatePublishingSample(
  trx: Transactional<DB>,
  id: string,
  input: CreateSample,
): Promise<void> {
  await updateSample(trx, id, input);
  await trx
    .updateTable("sample")
    .set({ status: "publishing" })
    .where("id", "=", id)
    .execute();
}

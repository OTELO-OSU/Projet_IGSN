import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { addParentOwnerAsContributor } from "./add-parent-owner-as-contributor.ts";
import { insertSampleRows } from "./insert-sample.ts";

export async function insertOwnedSample(
  trx: Transactional<DB>,
  input: CreateSample,
  ownerId: string,
  groups: InstitutionalGroups,
): Promise<string> {
  const id = await insertSampleRows(trx, input, groups);
  await insertSampleOwner(trx, id, ownerId);
  await addParentOwnerAsContributor(trx, id, input.parentIds ?? []);
  return id;
}

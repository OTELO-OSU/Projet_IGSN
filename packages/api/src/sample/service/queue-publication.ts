import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { insertOwnedSample } from "./insert-owned-sample.ts";
import { writeSample } from "./update-sample.ts";

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
  updatedAt: Date,
): Promise<void> {
  const row = await trx
    .updateTable("sample")
    .set({ status: "publishing" })
    .where("id", "=", id)
    .where("status", "=", "published")
    .where(sql<Date>`date_trunc('milliseconds', updated_at)`, "=", updatedAt)
    .returning("id")
    .executeTakeFirst();
  if (!row) {
    throw new HTTPException(409, { message: "Sample changed, retry" });
  }
  await writeSample(trx, id, input);
}

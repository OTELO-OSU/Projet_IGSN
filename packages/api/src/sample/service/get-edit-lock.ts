import type { SampleEditLock } from "@projet-igsn/domain/sample/edit-lock";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function getEditLock(
  db: Transactional<DB>,
  id: string,
): Promise<SampleEditLock | null> {
  const row = await db
    .selectFrom("sample_edit_lock")
    .innerJoin("user", "user.id", "sample_edit_lock.user_id")
    .select([
      "user.id as userId",
      "user.name",
      "user.firstname",
      "sample_edit_lock.expires_at as expiresAt",
    ])
    .where("sample_edit_lock.sample_id", "=", id)
    .where("sample_edit_lock.expires_at", ">", sql<Date>`now()`)
    .executeTakeFirst();
  return row ?? null;
}

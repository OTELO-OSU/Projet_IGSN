import type { SampleEditLock } from "@projet-igsn/domain/sample/edit-lock";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { editLockTtlMs } from "../edit-lock-ttl.ts";
import { getEditLock } from "./get-edit-lock.ts";

export async function acquireEditLock(
  db: Transactional<DB>,
  id: string,
  userId: string,
  ttlMs: number = editLockTtlMs,
): Promise<SampleEditLock | null> {
  const expiresAt = sql<Date>`now() + make_interval(secs => ${ttlMs / 1000})`;
  await db
    .insertInto("sample_edit_lock")
    .values({ sample_id: id, user_id: userId, expires_at: expiresAt })
    .onConflict((oc) =>
      oc
        .column("sample_id")
        .doUpdateSet({ user_id: userId, expires_at: expiresAt })
        .where((eb) =>
          eb.or([
            eb("sample_edit_lock.user_id", "=", userId),
            eb("sample_edit_lock.expires_at", "<=", sql<Date>`now()`),
          ]),
        ),
    )
    .execute();
  return getEditLock(db, id);
}

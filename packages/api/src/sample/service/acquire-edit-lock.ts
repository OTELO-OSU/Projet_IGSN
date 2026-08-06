import type { SampleEditLock } from "@projet-igsn/domain/sample/edit-lock";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { editLockTtlMs } from "../edit-lock-ttl.ts";
import { getEditLock } from "./get-edit-lock.ts";

// The lock is keyed by user, not by tab: `user_id = :userId` is what lets
// someone re-claim after a frozen tab, and what makes several tabs of the same
// user share one lock instead of fighting over it. Product decision.
//
// One statement decides it, so no `for update`: on conflict the loser of a race
// blocks on the winner's row, then re-evaluates the where clause against it and
// updates nothing.
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

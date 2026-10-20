import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { markParentsForSynchronization } from "./mark-parents-for-synchronization.ts";

export async function requeueFailedSynchronizations(
  db: Transactional<DB>,
  where: (eb: ExpressionBuilder<DB, "sample">) => Expression<SqlBool>,
): Promise<number> {
  const retried = await db
    .updateTable("sample")
    .set({ synchronization_status: "pending" })
    .where("synchronization_status", "=", "failed")
    .where(where)
    .returning(["id", "status"])
    .execute();
  await markParentsForSynchronization(
    db,
    retried.filter(({ status }) => status === "draft").map(({ id }) => id),
  );
  return retried.length;
}

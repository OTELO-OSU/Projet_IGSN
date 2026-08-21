import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function moderateInstitution(
  db: Transactional<DB>,
  userId: string,
  ...grants: {
    kind: DB["user_managed_institutional_group"]["kind"];
    code: string;
  }[]
): Promise<unknown> {
  return db
    .insertInto("user_managed_institutional_group")
    .values(grants.map((grant) => ({ user_id: userId, ...grant })))
    .execute();
}

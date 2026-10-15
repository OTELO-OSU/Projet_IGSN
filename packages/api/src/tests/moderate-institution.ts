import type { DB } from "../db.ts";

import { institutionIdOf } from "../institutional-group/stored-institution.ts";
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
    .values(
      grants.map(({ kind, code }) => ({
        user_id: userId,
        kind,
        code: institutionIdOf(kind, code),
      })),
    )
    .execute();
}

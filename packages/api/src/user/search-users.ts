import type { User } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

const SEARCH_LIMIT = 10;

export function searchUsers(
  db: Transactional<DB>,
  query: string,
): Promise<User[]> {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return db
    .selectFrom("user")
    .select(["id", "email", "name", "firstname"])
    .where((eb) =>
      eb.or([eb("name", "ilike", pattern), eb("email", "ilike", pattern)]),
    )
    .orderBy("name")
    .limit(SEARCH_LIMIT)
    .execute();
}

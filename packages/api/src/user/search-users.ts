import type { User } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

const SEARCH_LIMIT = 10;
// The share dialog opens on this list, before anything is typed.
const BROWSE_LIMIT = 20;

export function searchUsers(
  db: Transactional<DB>,
  query: string | undefined,
  callerId: string,
): Promise<User[]> {
  const others = db
    .selectFrom("user")
    .select(["id", "email", "name", "firstname"])
    .where("id", "!=", callerId);
  if (query === undefined) {
    return others.orderBy("email").limit(BROWSE_LIMIT).execute();
  }
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return others
    .where((eb) =>
      eb.or([eb("name", "ilike", pattern), eb("email", "ilike", pattern)]),
    )
    .orderBy("name")
    .limit(SEARCH_LIMIT)
    .execute();
}

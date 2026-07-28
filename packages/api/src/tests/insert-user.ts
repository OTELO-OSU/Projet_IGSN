import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

// A researcher to own samples in a spec. Inserts directly, since the api only
// ever provisions users from a token (see src/user/repository.ts).
export function insertUser(
  db: Transactional<DB>,
  email: string,
): Promise<{ id: string }> {
  return db
    .insertInto("user")
    .values({ id: crypto.randomUUID(), email, name: null, firstname: null })
    .returning("id")
    .executeTakeFirstOrThrow();
}

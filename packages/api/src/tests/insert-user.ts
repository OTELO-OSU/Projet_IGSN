import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

// Inserts directly, since the api only ever provisions users from a token
// (see src/user/repository.ts).
export function insertUser(
  db: Transactional<DB>,
  email: string,
  { orcid = null }: { orcid?: string | null } = {},
): Promise<{ id: string }> {
  return db
    .insertInto("user")
    .values({
      id: crypto.randomUUID(),
      email,
      name: null,
      firstname: null,
      orcid,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}

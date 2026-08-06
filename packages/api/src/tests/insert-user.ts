import type { UserStatus } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

// Inserts directly, since the api only ever provisions users from a token
// (see src/user/repository.ts).
export function insertUser(
  db: Transactional<DB>,
  email: string,
  overrides: {
    name?: string | null;
    orcid?: string | null;
    status?: UserStatus;
    superAdmin?: boolean;
  } = {},
): Promise<{ id: string }> {
  return db
    .insertInto("user")
    .values({
      id: crypto.randomUUID(),
      email,
      name: overrides.name ?? null,
      firstname: null,
      orcid: overrides.orcid,
      status: overrides.status,
      super_admin: overrides.superAdmin,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}

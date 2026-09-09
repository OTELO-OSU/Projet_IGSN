import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function insertServiceAccount(
  db: Transactional<DB>,
  name: string,
  ownerId: string,
  apiKeyHash: string | null = null,
): Promise<{ id: string }> {
  return db
    .insertInto("service_account")
    .values({
      id: crypto.randomUUID(),
      name,
      owner_id: ownerId,
      api_key_hash: apiKeyHash,
      institutional_organization: "04vfs2w97",
      institutional_osu: "OTELo",
      institutional_laboratory: "UMR7358",
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}

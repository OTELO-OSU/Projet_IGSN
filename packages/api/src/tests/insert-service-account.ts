import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function insertServiceAccount(
  db: Transactional<DB>,
  name: string,
  ownerId: string,
  apiKeyHash: string | null = null,
  sampleOwnerId: string = ownerId,
): Promise<{ id: string }> {
  return db
    .insertInto("service_account")
    .values({
      id: crypto.randomUUID(),
      name,
      owner_id: ownerId,
      sample_owner_id: sampleOwnerId,
      api_key_hash: apiKeyHash,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}

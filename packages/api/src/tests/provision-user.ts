import type { UserStatus } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
import { insertUser } from "./insert-user.ts";

// The email the test auth stub derives from a bearer token (see test/setup.ts).
export const tokenEmail = (sub: string) => `${sub}@example.com`;

// Arranges the caller's moderation state: the row written here is the one the
// request's upsert adopts, since both key on that email.
export function provisionUser(
  db: Transactional<DB>,
  sub: string,
  moderation: { status?: UserStatus; superAdmin?: boolean } = {},
): Promise<{ id: string }> {
  return insertUser(db, tokenEmail(sub), moderation);
}

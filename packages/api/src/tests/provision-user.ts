import type { UserStatus } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
import { insertUser } from "./insert-user.ts";

export const tokenEmail = (sub: string) => `${sub}@example.com`;

export function provisionUser(
  db: Transactional<DB>,
  sub: string,
  moderation: { status?: UserStatus; superAdmin?: boolean } = {},
): Promise<{ id: string }> {
  return insertUser(db, tokenEmail(sub), moderation);
}

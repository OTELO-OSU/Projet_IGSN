import type { UserStatus } from "@projet-igsn/domain/user/model";

import { createHash } from "node:crypto";
import path from "node:path";
import { expect } from "vitest";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
import { insertUser } from "./insert-user.ts";

const API_ROOT = path.resolve(import.meta.dirname, "../..");

const fileTag = () =>
  createHash("sha1")
    .update(path.relative(API_ROOT, expect.getState().testPath ?? ""))
    .digest("hex")
    .slice(0, 3);

export const tokenEmail = (sub: string) => `${sub}-${fileTag()}@example.com`;

export function provisionUser(
  db: Transactional<DB>,
  sub: string,
  moderation: { status?: UserStatus; superAdmin?: boolean } = {},
): Promise<{ id: string }> {
  return insertUser(db, tokenEmail(sub), moderation);
}

import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { moderatedSampleWhere } from "./moderated-sample-where.ts";

export async function isSampleModerated(
  db: Transactional<DB>,
  id: string,
  scope: ModerationScope,
): Promise<boolean> {
  const found = await db
    .selectFrom("sample")
    .select("id")
    .where("id", "=", id)
    .where(moderatedSampleWhere(scope))
    .executeTakeFirst();
  return found !== undefined;
}

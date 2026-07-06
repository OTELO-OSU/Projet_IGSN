import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

export async function getSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  const row = await db
    .selectFrom("sample")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
  return row ? toSample(row) : null;
}

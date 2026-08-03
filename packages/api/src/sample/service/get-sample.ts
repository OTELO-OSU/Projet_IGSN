import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { withSampleChildren } from "./with-sample-children.ts";

// Reads a sample and, in the same query, this user's role on it: the api answers
// 404 on no row and 403 on a row they hold no role on (ADR 0019).
export async function getSample(
  db: Transactional<DB>,
  id: string,
  userId: string,
): Promise<{ sample: Sample; role: UserSampleRole | null } | null> {
  const row = await db
    .selectFrom("sample")
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.sample_id", "=", "sample.id")
        .on("user_sample.user_id", "=", userId),
    )
    .selectAll("sample")
    .select("user_sample.role")
    .where("sample.id", "=", id)
    .executeTakeFirst();
  if (!row) return null;
  const { role, ...sampleRow } = row;
  const [sample] = await withSampleChildren(db, [sampleRow]);
  return { sample: sample!, role };
}

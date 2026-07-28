import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { withSampleChildren } from "./with-sample-children.ts";

// Reads a sample and, in the same query, whether this user owns it: the api
// answers 404 on no row and 403 on a row that is someone else's (ADR 0019).
// A sample nobody owns is owned by nobody, so it is forbidden to everyone.
export async function getSample(
  db: Transactional<DB>,
  id: string,
  ownerId: string,
): Promise<{ sample: Sample; owned: boolean } | null> {
  const row = await db
    .selectFrom("sample")
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.sample_id", "=", "sample.id")
        .on("user_sample.user_id", "=", ownerId),
    )
    .selectAll("sample")
    .select("user_sample.user_id")
    .where("sample.id", "=", id)
    .executeTakeFirst();
  if (!row) return null;
  const { user_id, ...sampleRow } = row;
  const [sample] = await withSampleChildren(db, [sampleRow]);
  return { sample: sample!, owned: user_id !== null };
}

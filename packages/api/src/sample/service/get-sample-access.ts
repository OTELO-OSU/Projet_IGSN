import type { SampleAccess } from "@projet-igsn/domain/sample/repository";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

// What the user may do with this sample id, in one query: no row means the
// sample does not exist, a null user_id means it is someone else's. The api
// needs both apart to answer 404 on an unknown id and 403 on another owner's
// sample. A sample nobody owns is forbidden to everyone.
export async function getSampleAccess(
  db: Transactional<DB>,
  id: string,
  userId: string,
): Promise<SampleAccess> {
  const row = await db
    .selectFrom("sample")
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.sample_id", "=", "sample.id")
        .on("user_sample.user_id", "=", userId),
    )
    .select("user_sample.user_id")
    .where("sample.id", "=", id)
    .executeTakeFirst();

  if (!row) return "missing";
  return row.user_id ? "owner" : "forbidden";
}

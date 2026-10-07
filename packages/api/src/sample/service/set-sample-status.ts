import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

function publicationDateOf(body: SetSampleStatusBody) {
  switch (body.status) {
    case "embargo":
      return sql`${body.publishedAt}::timestamptz`;
    case "published":
      return sql`now()`;
    default:
      return sql.ref("published_at");
  }
}

export async function setSampleStatus(
  db: Transactional<DB>,
  id: string,
  body: SetSampleStatusBody,
): Promise<Sample | null> {
  const at = publicationDateOf(body);
  const row = await db
    .updateTable("sample")
    .set({
      status: body.status,
      published_at: sql`case when status = 'embargo' then ${at} else published_at end`,
      publication_year: sql`case when status = 'embargo' then extract(year from ${at})::int else publication_year end`,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  return getSampleById(db, id);
}

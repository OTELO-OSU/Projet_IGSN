import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

export async function publishSample(
  db: Transactional<DB>,
  id: string,
  status: SetSampleStatusBody["status"] = "published",
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({
      status,
      igsn: generateIgsnSuffix(id),
      publication_year: sql`coalesce(publication_year, extract(year from now())::int)`,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  return getSampleById(db, id);
}

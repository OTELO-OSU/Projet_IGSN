import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { sql } from "kysely";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { syncDoi } from "../../datacite/sync-doi.ts";
import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

export async function publishSample(
  db: Transactional<DB>,
  id: string,
  status: PublishStatus = "published",
  config: DataCiteConfig | null = null,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({
      status,
      igsn: generateIgsnSuffix(id),
      doi_prefix: sql`coalesce(doi_prefix, ${config?.prefix ?? null})`,
      publication_year: sql`coalesce(publication_year, extract(year from now())::int)`,
      published_at: sql`coalesce(published_at, now())`,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  const sample = await getSampleById(db, id);
  // ponytail: the row stays locked for the DataCite round trip, and a commit failing after a successful PUT leaves a DOI the next publish re-registers, PUT being idempotent.
  await syncDoi(
    config,
    sample,
    status === "published" ? "publish" : "register",
  );
  return sample;
}

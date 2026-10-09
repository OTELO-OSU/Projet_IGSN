import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { sql } from "kysely";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { syncDoi } from "../../datacite/sync-doi.ts";
import { syncParentRelations } from "../../datacite/sync-parent-relations.ts";
import { queueBatchWebhooks } from "../../sample-batch/queue-batch-webhooks.ts";
import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

export async function publishSample(
  db: Transactional<DB>,
  id: string,
  status: PublishStatus = "published",
  config: DataCiteConfig | null = null,
  publishedAt?: string,
): Promise<Sample | null> {
  const at = publishedAt ? sql`${publishedAt}::timestamptz` : sql`now()`;
  const row = await db
    .updateTable("sample")
    .set({
      status,
      publishing_error: null,
      igsn: sql`coalesce(igsn, ${generateIgsnSuffix(id)})`,
      doi_prefix: sql`coalesce(doi_prefix, ${config?.prefix ?? null})`,
      publication_year: sql`coalesce(publication_year, extract(year from ${at})::int)`,
      published_at: sql`coalesce(published_at, ${at})`,
      // ponytail: a rolled-back publish burns its sequence value, so numbers may skip; a gapless counter needs a locked counter row.
      internal_number: sql`coalesce(internal_number, nextval('sample_internal_number_seq'))`,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  const sample = await getSampleById(db, id);
  // ponytail: the row stays locked for the DataCite round trip, and a commit failing after a successful PUT leaves a DOI the next publish re-registers, PUT being idempotent.
  await syncDoi(config, db, sample, { firstRegistration: true });
  for (const parent of sample.parents) {
    await syncParentRelations(config, db, parent.id);
  }
  await queueBatchWebhooks(db, [id]);
  return sample;
}

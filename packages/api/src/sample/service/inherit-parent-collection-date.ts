import { inheritedCollectionDate } from "@projet-igsn/domain/sample/parent/inherited-collection-date";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { collectionDateColumns } from "./description-columns.ts";
import { toCollectionDate } from "./to-sample.ts";

export async function inheritParentCollectionDate(
  db: Transactional<DB>,
  sampleId: string,
): Promise<void> {
  const parents = await db
    .selectFrom("sample_parent")
    .innerJoin("sample", "sample.id", "sample_parent.parent_id")
    .select([
      "sample.id",
      "sample.collection_date_start",
      "sample.collection_date_end",
      "sample.collection_date_precision",
      "sample.collection_date_time_zone",
    ])
    .where("sample_parent.sample_id", "=", sampleId)
    .execute();
  if (parents.length === 0) return;
  await db
    .updateTable("sample")
    .set(
      collectionDateColumns(
        inheritedCollectionDate(parents.map(toCollectionDate)),
      ),
    )
    .where("id", "=", sampleId)
    .execute();
}

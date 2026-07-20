import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Selectable } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

// Attach each sample's links and attachments (ADR 0017): two batched queries
// for the whole page, so a list never degenerates into per-row lookups.
// Ordering by id is creation order (app-generated UUIDv7).
export async function withSampleChildren(
  db: Transactional<DB>,
  rows: Selectable<DB["sample"]>[],
): Promise<Sample[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const links = Map.groupBy(
    await db
      .selectFrom("sample_link")
      .selectAll()
      .where("sample_id", "in", ids)
      .orderBy("id")
      .execute(),
    (row) => row.sample_id,
  );
  const attachments = Map.groupBy(
    await db
      .selectFrom("sample_attachment")
      .selectAll()
      .where("sample_id", "in", ids)
      .orderBy("id")
      .execute(),
    (row) => row.sample_id,
  );
  return rows.map((row) =>
    toSample(row, links.get(row.id) ?? [], attachments.get(row.id) ?? []),
  );
}

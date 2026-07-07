import type { Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

// Find samples whose classification contains `key` at any depth. `*` in an
// lquery matches zero-or-more labels, so `*.key.*` matches the key at the root,
// an interior node, or a leaf. Served by the gist index. `key` is bound as a
// parameter and cast to lquery (never string-concatenated into SQL).
export async function searchSamplesByMaterialKey(
  db: Transactional<DB>,
  key: string,
): Promise<Sample[]> {
  const rows = await db
    .selectFrom("sample")
    .selectAll()
    .where(sql<boolean>`material ~ (${`*.${key}.*`})::lquery`)
    .execute();
  return rows.map(toSample);
}

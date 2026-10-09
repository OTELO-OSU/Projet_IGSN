import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function listDescendantIds(
  db: Transactional<DB>,
  sampleIds: readonly string[],
): Promise<ReadonlyMap<string, string[]>> {
  if (sampleIds.length === 0) return new Map();
  const rows = await db
    .withRecursive("descendant(root_id, id)", (qb) =>
      qb
        .selectFrom("sample_parent")
        .select([
          "sample_parent.parent_id as root_id",
          "sample_parent.sample_id as id",
        ])
        .where("sample_parent.parent_id", "in", sampleIds)
        .union(
          qb
            .selectFrom("descendant")
            .innerJoin(
              "sample_parent",
              "sample_parent.parent_id",
              "descendant.id",
            )
            .select([
              "descendant.root_id as root_id",
              "sample_parent.sample_id as id",
            ]),
        ),
    )
    .selectFrom("descendant")
    .select(["root_id", "id"])
    .execute();
  const descendants = new Map<string, string[]>();
  for (const { root_id, id } of rows) {
    descendants.set(root_id, [...(descendants.get(root_id) ?? []), id]);
  }
  return descendants;
}

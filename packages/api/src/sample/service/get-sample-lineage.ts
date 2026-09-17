import type { SampleLineage } from "@projet-igsn/domain/sample/lineage/model";
import type { RawBuilder } from "kysely";

import { sampleLineageSchema } from "@projet-igsn/domain/sample/lineage/model";
import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

type LineageRow = {
  parent_id: string;
  child_id: string;
  generation: number;
  igsn: string;
  name: string;
  tombstone: boolean;
};

const lineageColumns = (generation: RawBuilder<unknown>) =>
  [
    "sample_parent.parent_id",
    "sample_parent.sample_id as child_id",
    generation.as("generation"),
    "sample.igsn",
    "sample.name",
    sql<boolean>`sample.status = 'tombstone'`.as("tombstone"),
  ] as const;

export async function getSampleLineage(
  db: Transactional<DB>,
  igsn: string,
): Promise<SampleLineage | null> {
  const root = await db
    .selectFrom("sample")
    .select(["id", "igsn", "name"])
    .where("igsn", "=", igsn)
    .where("status", "in", ["published", "withdrawn"])
    .executeTakeFirst();
  if (!root) return null;

  // ADR 0033: a published sample names its relatives whatever their status, draft excepted.
  const rows = (await db
    .withRecursive(
      "ancestor(parent_id, child_id, generation, igsn, name, tombstone)",
      (qb) =>
        qb
          .selectFrom("sample_parent")
          .innerJoin("sample", (join) =>
            join
              .onRef("sample.id", "=", "sample_parent.parent_id")
              .on("sample.status", "<>", "draft"),
          )
          .select(lineageColumns(sql`-1`))
          .where("sample_parent.sample_id", "=", root.id)
          .union(
            qb
              .selectFrom("ancestor")
              .innerJoin(
                "sample_parent",
                "sample_parent.sample_id",
                "ancestor.parent_id",
              )
              .innerJoin("sample", (join) =>
                join
                  .onRef("sample.id", "=", "sample_parent.parent_id")
                  .on("sample.status", "<>", "draft"),
              )
              .select(lineageColumns(sql`ancestor.generation - 1`)),
          ),
    )
    .withRecursive(
      "descendant(parent_id, child_id, generation, igsn, name, tombstone)",
      (qb) =>
        qb
          .selectFrom("sample_parent")
          .innerJoin("sample", (join) =>
            join
              .onRef("sample.id", "=", "sample_parent.sample_id")
              .on("sample.status", "<>", "draft"),
          )
          .select(lineageColumns(sql`1`))
          .where("sample_parent.parent_id", "=", root.id)
          .union(
            qb
              .selectFrom("descendant")
              .innerJoin(
                "sample_parent",
                "sample_parent.parent_id",
                "descendant.child_id",
              )
              .innerJoin("sample", (join) =>
                join
                  .onRef("sample.id", "=", "sample_parent.sample_id")
                  .on("sample.status", "<>", "draft"),
              )
              .select(lineageColumns(sql`descendant.generation + 1`)),
          ),
    )
    .selectFrom("ancestor")
    .selectAll()
    .unionAll((eb) => eb.selectFrom("descendant").selectAll())
    .orderBy("generation")
    .orderBy("name")
    .execute()) as LineageRow[];

  const nodes = new Map([
    [root.id, { ...root, igsn, generation: 0, tombstone: false }],
  ]);
  for (const row of rows) {
    const id = row.generation < 0 ? row.parent_id : row.child_id;
    const known = nodes.get(id);
    if (known && Math.abs(known.generation) >= Math.abs(row.generation)) {
      continue;
    }
    nodes.set(id, {
      id,
      igsn: row.igsn,
      name: row.name,
      generation: row.generation,
      tombstone: row.tombstone,
    });
  }

  const edges = new Map(
    rows
      .filter((row) => nodes.has(row.parent_id) && nodes.has(row.child_id))
      .map((row) => [
        `${row.parent_id}/${row.child_id}`,
        { parentId: row.parent_id, childId: row.child_id },
      ]),
  );

  return sampleLineageSchema.parse({
    nodes: [...nodes.values()].sort((a, b) => a.generation - b.generation),
    edges: [...edges.values()],
  });
}

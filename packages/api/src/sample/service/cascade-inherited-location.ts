import { type ExpressionBuilder, type SqlBool, type Expression } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

const followsLocation = (
  eb: ExpressionBuilder<DB, "sample_parent" | "sample">,
  oldLocationId: string | null,
): Expression<SqlBool> =>
  eb.and([
    eb("sample.location_id", "is not distinct from", oldLocationId),
    eb.not(
      eb.exists(
        eb
          .selectFrom("sample_parent as other")
          .select("other.parent_id")
          .whereRef("other.sample_id", "=", "sample_parent.sample_id")
          .whereRef("other.parent_id", "<>", "sample_parent.parent_id"),
      ),
    ),
  ]);

export async function cascadeInheritedLocation(
  db: Transactional<DB>,
  sampleId: string,
  oldLocationId: string | null,
  newLocationId: string | null,
): Promise<void> {
  await db
    .withRecursive("follower(id)", (qb) =>
      qb
        .selectFrom("sample_parent")
        .innerJoin("sample", "sample.id", "sample_parent.sample_id")
        .select("sample_parent.sample_id as id")
        .where("sample_parent.parent_id", "=", sampleId)
        .where((eb) => followsLocation(eb, oldLocationId))
        .union(
          qb
            .selectFrom("follower")
            .innerJoin(
              "sample_parent",
              "sample_parent.parent_id",
              "follower.id",
            )
            .innerJoin("sample", "sample.id", "sample_parent.sample_id")
            .select("sample_parent.sample_id as id")
            .where((eb) => followsLocation(eb, oldLocationId)),
        ),
    )
    .updateTable("sample")
    .set({ location_id: newLocationId })
    .where("id", "in", (eb) => eb.selectFrom("follower").select("id"))
    .execute();
}

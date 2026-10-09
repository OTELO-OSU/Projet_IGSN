import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_series_membership")
    .addColumn("sample_id", "uuid", (col) =>
      col.primaryKey().references("sample.id").onDelete("cascade"),
    )
    .addColumn("series_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addCheckConstraint(
      "sample_series_membership_not_self",
      sql`series_id <> sample_id`,
    )
    .execute();
  await db.schema
    .createIndex("sample_series_membership_series_id")
    .on("sample_series_membership")
    .column("series_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_series_membership").execute();
}

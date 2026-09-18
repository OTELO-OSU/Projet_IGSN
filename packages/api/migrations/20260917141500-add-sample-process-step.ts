import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_process_step")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("date_start", "text")
    .addColumn("date_end", "text")
    .addColumn("date_precision", "text", (col) =>
      col.check(sql`date_precision IN ('day', 'hour')`),
    )
    .addColumn("date_time_zone", "text")
    .addColumn("description", "text")
    .addCheckConstraint(
      "sample_process_step_hour_precision_has_time_zone",
      sql`date_precision IS DISTINCT FROM 'hour' OR date_time_zone IS NOT NULL`,
    )
    .execute();
  await db.schema
    .createIndex("sample_process_step_sample_id")
    .on("sample_process_step")
    .column("sample_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_process_step").execute();
}

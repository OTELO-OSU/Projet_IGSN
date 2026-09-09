import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_parent")
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("parent_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("sample_parent_pkey", ["sample_id", "parent_id"])
    .addCheckConstraint("sample_parent_not_self", sql`sample_id <> parent_id`)
    .execute();

  await db.schema
    .createIndex("sample_parent_parent_id")
    .on("sample_parent")
    .column("parent_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_parent").execute();
}

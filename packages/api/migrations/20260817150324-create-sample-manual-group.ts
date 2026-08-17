import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_manual_group")
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("group_id", "uuid", (col) =>
      col.notNull().references("manual_group.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("sample_manual_group_pkey", [
      "sample_id",
      "group_id",
    ])
    .execute();

  await db.schema
    .createIndex("sample_manual_group_group_id")
    .on("sample_manual_group")
    .column("group_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_manual_group").execute();
}

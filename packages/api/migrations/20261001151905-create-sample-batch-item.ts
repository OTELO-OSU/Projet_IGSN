import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_batch_item")
    .addColumn("batch_id", "uuid", (col) => col.notNull())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("partner_id", "text", (col) => col.notNull())
    .addColumn("service_account_id", "uuid", (col) =>
      col.notNull().references("service_account.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("sample_batch_item_pkey", [
      "batch_id",
      "sample_id",
    ])
    .execute();
  await db.schema
    .createIndex("sample_batch_item_sample_id")
    .on("sample_batch_item")
    .column("sample_id")
    .execute();
  await db.schema
    .createIndex("sample_batch_item_service_account_id")
    .on("sample_batch_item")
    .column("service_account_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("sample_batch_item_service_account_id").execute();
  await db.schema.dropIndex("sample_batch_item_sample_id").execute();
  await db.schema.dropTable("sample_batch_item").execute();
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_batch_webhook")
    .addColumn("batch_id", "uuid", (col) => col.primaryKey())
    .addColumn("service_account_id", "uuid", (col) =>
      col.notNull().references("service_account.id").onDelete("cascade"),
    )
    .addColumn("url", "text", (col) => col.notNull())
    .addColumn("secret", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex("sample_batch_webhook_service_account_id")
    .on("sample_batch_webhook")
    .column("service_account_id")
    .execute();
  await db.schema
    .createTable("webhook_delivery")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("batch_id", "uuid", (col) => col.notNull())
    .addColumn("sample_id", "uuid", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("attempt", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("next_attempt_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      "webhook_delivery_sample_batch_item_fkey",
      ["batch_id", "sample_id"],
      "sample_batch_item",
      ["batch_id", "sample_id"],
      (constraint) => constraint.onDelete("cascade"),
    )
    .execute();
  await db.schema
    .createIndex("webhook_delivery_next_attempt_at")
    .on("webhook_delivery")
    .column("next_attempt_at")
    .execute();
  await db.schema
    .createIndex("webhook_delivery_batch_id_sample_id")
    .on("webhook_delivery")
    .columns(["batch_id", "sample_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("webhook_delivery").execute();
  await db.schema.dropTable("sample_batch_webhook").execute();
}

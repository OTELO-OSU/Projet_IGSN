import { type Kysely } from "kysely";

// Related DOI links and attached files, one-to-many with sample (ADR 0017).
// url/name are NOT NULL: a description without its url/file cannot exist by
// construction. Attachment content lives on disk keyed by the row id.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_link")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("url", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .execute();
  await db.schema
    .createIndex("sample_link_sample_id")
    .on("sample_link")
    .column("sample_id")
    .execute();

  await db.schema
    .createTable("sample_attachment")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("media_type", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .execute();
  await db.schema
    .createIndex("sample_attachment_sample_id")
    .on("sample_attachment")
    .column("sample_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_attachment").execute();
  await db.schema.dropTable("sample_link").execute();
}

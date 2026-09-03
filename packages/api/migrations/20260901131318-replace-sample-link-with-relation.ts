import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_relation")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("relation_type", "text", (col) => col.notNull())
    .addColumn("identifier_type", "text", (col) => col.notNull())
    .addColumn("identifier", "text", (col) => col.notNull())
    .addColumn("target_title", "text", (col) => col.notNull())
    .addColumn("target_resource_type", "text")
    .addColumn("relation_type_information", "text")
    .addColumn("related_metadata_scheme", "text")
    .addColumn("scheme_uri", "text")
    .addColumn("scheme_type", "text")
    .addColumn("description", "text")
    .execute();
  await db.schema
    .createIndex("sample_relation_sample_id")
    .on("sample_relation")
    .column("sample_id")
    .execute();

  await sql`
    INSERT INTO sample_relation (id, sample_id, relation_type, identifier_type, identifier, target_title, description)
    SELECT id, sample_id, 'other', 'doi', url, url, description FROM sample_link
  `.execute(db);
  await db.schema.dropTable("sample_link").execute();

  await db.schema
    .alterTable("sample_attachment")
    .addColumn("title", "text")
    .addColumn("target_resource_type", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample_attachment")
    .dropColumn("target_resource_type")
    .dropColumn("title")
    .execute();

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

  await sql`
    INSERT INTO sample_link (id, sample_id, url, description)
    SELECT id, sample_id, identifier, description FROM sample_relation
  `.execute(db);
  await db.schema.dropTable("sample_relation").execute();
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    // Nullable: the igsn only becomes mandatory once the sample is published.
    .addColumn("igsn", "text", (col) => col.unique())
    .addColumn("published", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
  await sql`
    ALTER TABLE sample
    ADD CONSTRAINT sample_published_requires_igsn
    CHECK (NOT published OR igsn IS NOT NULL)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Dropping the columns also drops the check constraint referencing them.
  await db.schema
    .alterTable("sample")
    .dropColumn("published")
    .dropColumn("igsn")
    .execute();
}

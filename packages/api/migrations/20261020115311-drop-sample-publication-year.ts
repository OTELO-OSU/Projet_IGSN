import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("publication_year").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("publication_year", "integer")
    .execute();
  await sql`UPDATE sample SET publication_year = extract(year from published_at)::int`.execute(
    db,
  );
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("published_at", sql`timestamptz`)
    .execute();
  await sql`UPDATE sample SET published_at = updated_at WHERE status <> 'draft'`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("published_at").execute();
}

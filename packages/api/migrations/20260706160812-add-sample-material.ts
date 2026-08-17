import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS ltree`.execute(db);
  await db.schema
    .alterTable("sample")
    .addColumn("material", sql`ltree`)
    .execute();
  await sql`CREATE INDEX sample_material_idx ON sample USING GIST (material)`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("material").execute();
}

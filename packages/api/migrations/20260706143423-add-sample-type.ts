import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS ltree`.execute(db);
  await db.schema
    .alterTable("sample")
    // Mandatory at declaration. The value is a taxonomy path (e.g.
    // "core.section") validated in domain; ltree gives indexable ancestor
    // queries (type <@ 'core').
    .addColumn("type", sql`ltree`, (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // The ltree extension is left in place; other columns may rely on it.
  await db.schema.alterTable("sample").dropColumn("type").execute();
}

import { type Kysely, sql } from "kysely";

// Diacritic-insensitive sample search (unaccent(col) ILIKE unaccent(pattern)).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS unaccent`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP EXTENSION IF EXISTS unaccent`.execute(db);
}

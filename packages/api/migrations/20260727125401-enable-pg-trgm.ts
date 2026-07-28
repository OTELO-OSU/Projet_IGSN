import { type Kysely, sql } from "kysely";

// word_similarity, for the sample search's typo tolerance.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP EXTENSION IF EXISTS pg_trgm`.execute(db);
}

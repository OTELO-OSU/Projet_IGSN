import { type Kysely, sql } from "kysely";

// Spatial search of samples by location (ADR 0014): PostGIS provides the
// geography type and the GiST index used by the location table.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP EXTENSION IF EXISTS postgis`.execute(db);
}

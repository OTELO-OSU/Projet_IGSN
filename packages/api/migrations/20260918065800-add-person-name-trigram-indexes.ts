import { type Kysely, sql } from "kysely";

const FACETED_NAME_COLUMNS = [
  "sc_chief_scientist_firstname",
  "sc_chief_scientist_lastname",
  "sc_collector_firstname",
  "sc_collector_lastname",
  "sc_collection_curator_firstname",
  "sc_collection_curator_lastname",
] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const column of FACETED_NAME_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (public.immutable_unaccent(coalesce(${sql.ref(column)}, '')) gin_trgm_ops)
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of FACETED_NAME_COLUMNS) {
    await sql`DROP INDEX ${sql.raw(`sample_${column}_trgm_idx`)}`.execute(db);
  }
}

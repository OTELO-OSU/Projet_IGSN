import { type Kysely, sql } from "kysely";

// unaccent() is only STABLE (its dictionary resolves through search_path), so
// Postgres refuses it in an index expression; immutable_unaccent pins the
// dictionary, schema-qualified because CREATE INDEX restricts search_path.
// These expressions must stay byte-for-byte what `search-filter.ts` builds.
const SEARCHED_COLUMNS = ["name", "specific_name", "igsn"] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE FUNCTION public.immutable_unaccent(value text) RETURNS text
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
      RETURN public.unaccent('public.unaccent'::regdictionary, value)
  `.execute(db);

  for (const column of SEARCHED_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (public.immutable_unaccent(coalesce(${sql.ref(column)}, '')) gin_trgm_ops)
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of SEARCHED_COLUMNS) {
    await sql`DROP INDEX ${sql.raw(`sample_${column}_trgm_idx`)}`.execute(db);
  }
  await sql`DROP FUNCTION public.immutable_unaccent(text)`.execute(db);
}

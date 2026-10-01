import { type Kysely, sql } from "kysely";

const SEARCHED_COLUMNS = ["name", "specific_name", "local_id"] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ${sql.join(
        SEARCHED_COLUMNS.map(
          (column) =>
            sql`ADD COLUMN ${sql.ref(`${column}_unaccented`)} text GENERATED ALWAYS AS (public.immutable_unaccent(coalesce(${sql.ref(column)}, ''))) STORED`,
        ),
      )}
  `.execute(db);
  for (const column of SEARCHED_COLUMNS) {
    await sql`DROP INDEX ${sql.raw(`sample_${column}_trgm_idx`)}`.execute(db);
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (${sql.ref(`${column}_unaccented`)} gin_trgm_ops)
    `.execute(db);
  }
  await sql`ANALYZE sample`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ${sql.join(
        SEARCHED_COLUMNS.map(
          (column) => sql`DROP COLUMN ${sql.ref(`${column}_unaccented`)}`,
        ),
      )}
  `.execute(db);
  for (const column of SEARCHED_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (public.immutable_unaccent(coalesce(${sql.ref(column)}, '')) gin_trgm_ops)
    `.execute(db);
  }
}

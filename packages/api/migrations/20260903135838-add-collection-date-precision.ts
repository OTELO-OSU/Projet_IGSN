import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN collection_date_start TYPE text,
      ALTER COLUMN collection_date_end TYPE text,
      ADD COLUMN collection_date_precision text
        CHECK (collection_date_precision IN ('day', 'hour')),
      ADD COLUMN collection_date_time_zone text,
      ADD CONSTRAINT sample_hour_precision_has_time_zone
        CHECK (collection_date_precision IS DISTINCT FROM 'hour' OR collection_date_time_zone IS NOT NULL)
  `.execute(db);

  await sql`
    UPDATE sample SET collection_date_precision = 'day'
    WHERE collection_date_start IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN collection_date_precision,
      DROP COLUMN collection_date_time_zone,
      ALTER COLUMN collection_date_start TYPE date
        USING left(collection_date_start, 10)::date,
      ALTER COLUMN collection_date_end TYPE date
        USING left(collection_date_end, 10)::date
  `.execute(db);
}

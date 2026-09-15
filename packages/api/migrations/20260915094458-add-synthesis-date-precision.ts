import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN syn_synthesis_date_start TYPE text,
      ALTER COLUMN syn_synthesis_date_end TYPE text,
      ADD COLUMN syn_synthesis_date_precision text
        CHECK (syn_synthesis_date_precision IN ('day', 'hour')),
      ADD COLUMN syn_synthesis_date_time_zone text,
      ADD CONSTRAINT sample_synthesis_hour_precision_has_time_zone
        CHECK (syn_synthesis_date_precision IS DISTINCT FROM 'hour' OR syn_synthesis_date_time_zone IS NOT NULL)
  `.execute(db);

  await sql`
    UPDATE sample SET syn_synthesis_date_precision = 'day'
    WHERE syn_synthesis_date_start IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN syn_synthesis_date_precision,
      DROP COLUMN syn_synthesis_date_time_zone,
      ALTER COLUMN syn_synthesis_date_start TYPE date
        USING left(syn_synthesis_date_start, 10)::date,
      ALTER COLUMN syn_synthesis_date_end TYPE date
        USING left(syn_synthesis_date_end, 10)::date
  `.execute(db);
}

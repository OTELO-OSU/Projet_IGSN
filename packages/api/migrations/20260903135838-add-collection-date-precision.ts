import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN collection_date_start TYPE timestamptz
        USING collection_date_start::timestamp AT TIME ZONE 'UTC',
      ALTER COLUMN collection_date_end TYPE timestamptz
        USING collection_date_end::timestamp AT TIME ZONE 'UTC'
  `.execute(db);

  await sql`
    ALTER TABLE sample
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
  await db.schema
    .alterTable("sample")
    .dropColumn("collection_date_precision")
    .dropColumn("collection_date_time_zone")
    .execute();

  await sql`
    ALTER TABLE sample
      ALTER COLUMN collection_date_start TYPE date
        USING (collection_date_start AT TIME ZONE 'UTC')::date,
      ALTER COLUMN collection_date_end TYPE date
        USING (collection_date_end AT TIME ZONE 'UTC')::date
  `.execute(db);
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN collection_date_start TYPE timestamptz
        USING collection_date_start::timestamp AT TIME ZONE 'UTC',
      ALTER COLUMN collection_date_end TYPE timestamptz
        USING collection_date_end::timestamp AT TIME ZONE 'UTC'
  `.execute(db);

  await db.schema
    .alterTable("sample")
    .addColumn("collection_date_precision", sql`text`)
    .addColumn("collection_date_time_zone", sql`text`)
    .execute();

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

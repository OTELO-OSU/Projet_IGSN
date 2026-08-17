import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN geological_age_min TYPE integer USING (
        CASE WHEN geological_age_min ~ '^ics[0-9]+$'
          THEN substring(geological_age_min from 4)::integer END
      ),
      ALTER COLUMN geological_age_max TYPE integer USING (
        CASE WHEN geological_age_max ~ '^ics[0-9]+$'
          THEN substring(geological_age_max from 4)::integer END
      )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN geological_age_min TYPE text USING (
        'ics' || geological_age_min
      ),
      ALTER COLUMN geological_age_max TYPE text USING (
        'ics' || geological_age_max
      )
  `.execute(db);
}

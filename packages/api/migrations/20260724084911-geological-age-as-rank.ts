import { type Kysely, sql } from "kysely";

// Store the geological age bounds as their rank (a 1-based integer) instead of
// the ics<N> code text, so an age-range filter compares them directly with no
// generated column and no string parsing. The domain value IS this rank (see
// geological-age.ts); the i18n key derives from it (age_ics_<rank>). The USING
// clause converts any existing rows: a well-formed ics<N> value becomes N,
// anything else becomes NULL (the column is plain text with no CHECK, so a
// stray value must not make the migration fail).
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

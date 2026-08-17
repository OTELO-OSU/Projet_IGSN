import { type Kysely, sql } from "kysely";

const annum = (bound: "min" | "max") => sql`
  CASE numeric_age_unit
    WHEN 'ka' THEN numeric_age_${sql.raw(bound)} * 1e3
    WHEN 'ma' THEN numeric_age_${sql.raw(bound)} * 1e6
    WHEN 'ga' THEN numeric_age_${sql.raw(bound)} * 1e9
    WHEN 'a' THEN CASE numeric_age_years_unit
      WHEN 'bp' THEN numeric_age_${sql.raw(bound)}
      WHEN 'cal_bp' THEN numeric_age_${sql.raw(bound)}
      WHEN 'ce' THEN 1950 - numeric_age_${sql.raw(bound)}
      WHEN 'bce' THEN 1950 + numeric_age_${sql.raw(bound)} - 1
    END
  END
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ADD COLUMN numeric_age_min_a double precision
        GENERATED ALWAYS AS (${annum("min")}) STORED,
      ADD COLUMN numeric_age_max_a double precision
        GENERATED ALWAYS AS (${annum("max")}) STORED
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("numeric_age_min_a")
    .dropColumn("numeric_age_max_a")
    .execute();
}

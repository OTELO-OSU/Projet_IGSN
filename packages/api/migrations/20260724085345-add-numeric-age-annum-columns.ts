import { type Kysely, sql } from "kysely";

// Numeric age bounds in canonical annum, as generated STORED columns, so an
// age-range filter compares mixed-unit samples directly (and can be indexed
// later). Unlike the geological rank, the numeric annum is a derived value: the
// sample keeps its own value + unit for display, so the comparable figure lives
// in a generated column rather than replacing the stored value.
// The multipliers duplicate domain numericAgeToAnnum (4 stable SI constants);
// keep them in sync. A null/unknown unit yields NULL (no ELSE), so the cast
// never throws and the row is simply unmatched by any range filter. The years
// unit (CE/BCE/BP) offset is not applied: negligible against ka/Ma/Ga.
// No index here: the sample list already seq-scans at registry scale (see the
// ponytail note in list-sample.ts). Add a btree on these columns if it grows.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ADD COLUMN numeric_age_min_a double precision GENERATED ALWAYS AS (
        numeric_age_min * CASE numeric_age_unit
          WHEN 'a' THEN 1 WHEN 'ka' THEN 1e3 WHEN 'ma' THEN 1e6 WHEN 'ga' THEN 1e9
        END
      ) STORED,
      ADD COLUMN numeric_age_max_a double precision GENERATED ALWAYS AS (
        numeric_age_max * CASE numeric_age_unit
          WHEN 'a' THEN 1 WHEN 'ka' THEN 1e3 WHEN 'ma' THEN 1e6 WHEN 'ga' THEN 1e9
        END
      ) STORED
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("numeric_age_min_a")
    .dropColumn("numeric_age_max_a")
    .execute();
}

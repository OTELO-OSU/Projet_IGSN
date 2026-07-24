import { type Kysely, sql } from "kysely";

// Numeric age bounds in canonical annum (years before present), as generated
// STORED columns, so an age-range filter compares mixed-unit samples directly
// (and can be indexed later). Unlike the geological rank, the numeric annum is a
// derived value: the sample keeps its own value + unit for display, so the
// comparable figure lives in a generated column rather than replacing the value.
//
// The ka/Ma/Ga multipliers duplicate domain numericAgeToAnnum (stable SI
// constants); keep them in sync. The 'a' (annum) unit carries a calendar
// reference (numeric_age_years_unit) that this offset applies, so a 500 BCE, a
// 500 CE and a 500 BP sample land at three different points, not one: the offset
// is not negligible for small year ranges, which searches do hit. Present is
// 1950 CE (the radiocarbon / cal BP zero-point), and BCE has no year zero.
// This offset lives only here: the query stays on the before-present axis (list
// query 'a' means BP), so numericAgeToAnnum never needs it.
//
// A null unit, or an 'a' with no reference yet (an unfinished draft), yields
// NULL (no ELSE), so the row cannot be placed on the axis and is simply
// unmatched by any range filter, rather than guessed onto it.
// No index here: the sample list already seq-scans at registry scale (see the
// ponytail note in list-sample.ts). Add a btree on these columns if it grows.
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

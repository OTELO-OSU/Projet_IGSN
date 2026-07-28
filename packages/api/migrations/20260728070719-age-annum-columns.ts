import { type Kysely, type RawBuilder, sql } from "kysely";

// The sample's comparable age interval in canonical annum (years before
// present), as generated STORED columns: age_min_a is the youngest edge,
// age_max_a the oldest, so an age-range filter is two plain column comparisons
// (and can be indexed later). Replaces numeric_age_*_a, which covered only the
// numeric age; a generated expression cannot be altered in place, hence
// drop + add.
//
// Numeric age wins when present, geological rank is the fallback: LEAST/GREATEST
// ignore NULLs, so a single-bound draft still yields a numeric value and does not
// fall through, which is why COALESCE sits outside them. A sample with neither
// age yields NULL on both columns and is unmatchable by any range filter, rather
// than guessed onto the axis.
//
// The ka/Ma/Ga multipliers duplicate domain numericAgeToAnnum (stable SI
// constants); keep them in sync. The 'a' (annum) unit carries a calendar
// reference (numeric_age_years_unit) that this offset applies, so a 500 BCE, a
// 500 CE and a 500 BP sample land at three different points, not one: the offset
// is not negligible for small year ranges, which searches do hit. Present is
// 1950 CE (the radiocarbon / cal BP zero-point), and BCE has no year zero.
// The offset applies to the stored value only: the query side stays on the
// before-present axis (list query 'a' means BP), so numericAgeToAnnum never
// needs it.
//
// A null unit, or an 'a' with no reference yet (an unfinished draft), yields
// NULL (no ELSE). A generated column cannot reference another generated column,
// so this expression is inlined in both.
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

// ICS International Chronostratigraphic Chart v2023/09 series/epoch boundary
// ages, in Ma, ascending. Element i (1-based) is the boundary before rank i, so
// rank r spans subscripts [r, r + 1] = [young edge, old edge]. Exact GSSP values;
// the Hadean base uses the age-of-Earth convention (4567 Ma) since the chart
// leaves it informal. Frozen here on purpose: adopting a newer chart means a new
// migration that rewrites the columns, not an edit to this one.
// Raw, not bound: Postgres takes no bind parameter in DDL ("could not determine
// data type of parameter $1"), so interpolating this list fails at migrate time.
const ICS_BOUNDARIES_MA = `
  0, 0.0117, 2.58, 5.333, 23.03, 33.9, 56.0, 66.0, 100.5, 145.0, 161.5, 174.7,
  201.4, 237, 247.2, 251.902, 259.51, 273.01, 298.9, 323.2, 358.9, 382.7, 393.3,
  419.2, 423.0, 427.4, 433.4, 443.8, 458.4, 470.0, 485.4, 497, 509, 521, 538.8,
  635, 720, 1000, 1200, 1400, 1600, 1800, 2050, 2300, 2500, 2800, 3200, 3600,
  4031, 4567
`;

// One edge of the rank interval, in annum. The Ma boundary is multiplied by 1e6,
// the same IEEE operation numericAgeToAnnum(x, "ma") does on the query side, so a
// bound exactly on a stage edge compares equal. An out-of-range or NULL subscript
// yields NULL in Postgres, so a bad or absent rank is unmatchable, not an error.
const geologicalAnnum = (subscript: RawBuilder<number>) => sql`
  (ARRAY[${sql.raw(ICS_BOUNDARIES_MA)}]::double precision[])[${subscript}]
    * 1e6::double precision
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN numeric_age_min_a,
      DROP COLUMN numeric_age_max_a,
      ADD COLUMN age_min_a double precision GENERATED ALWAYS AS (
        COALESCE(
          LEAST(${annum("min")}, ${annum("max")}),
          ${geologicalAnnum(sql`LEAST(geological_age_min, geological_age_max)`)}
        )
      ) STORED,
      ADD COLUMN age_max_a double precision GENERATED ALWAYS AS (
        COALESCE(
          GREATEST(${annum("min")}, ${annum("max")}),
          ${geologicalAnnum(sql`GREATEST(geological_age_min, geological_age_max) + 1`)}
        )
      ) STORED
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN age_min_a,
      DROP COLUMN age_max_a,
      ADD COLUMN numeric_age_min_a double precision
        GENERATED ALWAYS AS (${annum("min")}) STORED,
      ADD COLUMN numeric_age_max_a double precision
        GENERATED ALWAYS AS (${annum("max")}) STORED
  `.execute(db);
}

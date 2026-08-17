import { type Kysely, type RawBuilder, sql } from "kysely";

const numericAgeToAnnum = (bound: "min" | "max") => sql`
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

// ICS chart v2023/09 GSSP boundaries, in Ma: rank r spans subscripts [r, r + 1].
// The Hadean base takes the age-of-Earth convention (4567), left informal there.
const ICS_BOUNDARIES_MA = `
  0, 0.0117, 2.58, 5.333, 23.03, 33.9, 56.0, 66.0, 100.5, 145.0, 161.5, 174.7,
  201.4, 237, 247.2, 251.902, 259.51, 273.01, 298.9, 323.2, 358.9, 382.7, 393.3,
  419.2, 423.0, 427.4, 433.4, 443.8, 458.4, 470.0, 485.4, 497, 509, 521, 538.8,
  635, 720, 1000, 1200, 1400, 1600, 1800, 2050, 2300, 2500, 2800, 3200, 3600,
  4031, 4567
`;

const geologicalAgeToAnnum = (subscript: RawBuilder<number>) => sql`
  (ARRAY[${sql.raw(ICS_BOUNDARIES_MA)}]::double precision[])[${subscript}]
    * 1e6::double precision
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN numeric_age_min_a,
      DROP COLUMN numeric_age_max_a,
      ADD COLUMN annum_min double precision GENERATED ALWAYS AS (
        COALESCE(
          LEAST(${numericAgeToAnnum("min")}, ${numericAgeToAnnum("max")}),
          ${geologicalAgeToAnnum(sql`LEAST(geological_age_min, geological_age_max)`)}
        )
      ) STORED,
      ADD COLUMN annum_max double precision GENERATED ALWAYS AS (
        COALESCE(
          GREATEST(${numericAgeToAnnum("min")}, ${numericAgeToAnnum("max")}),
          ${geologicalAgeToAnnum(sql`GREATEST(geological_age_min, geological_age_max) + 1`)}
        )
      ) STORED
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN annum_min,
      DROP COLUMN annum_max,
      ADD COLUMN numeric_age_min_a double precision
        GENERATED ALWAYS AS (${numericAgeToAnnum("min")}) STORED,
      ADD COLUMN numeric_age_max_a double precision
        GENERATED ALWAYS AS (${numericAgeToAnnum("max")}) STORED
  `.execute(db);
}

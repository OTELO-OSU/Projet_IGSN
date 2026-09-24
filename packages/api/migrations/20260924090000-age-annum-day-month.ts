import { type Kysely, type RawBuilder, sql } from "kysely";

const numericAgeToAnnum = (
  bound: "min" | "max",
  withDayAndMonth: boolean,
) => sql`
  CASE numeric_age_unit
    ${withDayAndMonth ? sql`WHEN 'day' THEN numeric_age_${sql.raw(bound)} / 365.25` : sql``}
    ${withDayAndMonth ? sql`WHEN 'month' THEN numeric_age_${sql.raw(bound)} / 12` : sql``}
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

const replaceAnnumColumns = (withDayAndMonth: boolean) => sql`
  ALTER TABLE sample
    DROP COLUMN annum_min,
    DROP COLUMN annum_max,
    ADD COLUMN annum_min double precision GENERATED ALWAYS AS (
      COALESCE(
        LEAST(
          ${numericAgeToAnnum("min", withDayAndMonth)},
          ${numericAgeToAnnum("max", withDayAndMonth)}
        ),
        ${geologicalAgeToAnnum(sql`LEAST(geological_age_min, geological_age_max)`)}
      )
    ) STORED,
    ADD COLUMN annum_max double precision GENERATED ALWAYS AS (
      COALESCE(
        GREATEST(
          ${numericAgeToAnnum("min", withDayAndMonth)},
          ${numericAgeToAnnum("max", withDayAndMonth)}
        ),
        ${geologicalAgeToAnnum(sql`GREATEST(geological_age_min, geological_age_max) + 1`)}
      )
    ) STORED
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await replaceAnnumColumns(true).execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await replaceAnnumColumns(false).execute(db);
}

import { type Kysely } from "kysely";

// Age is a flat sub-datum of the sample, like every other one: nullable columns
// on the sample table (an empty age is all-null). A non-range value stores the
// same number/code in both bounds (min == max), so search is uniform. Numeric
// ages are approximate measurements, so double precision; codes and units are
// text.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("numeric_age_min", "double precision")
    .addColumn("numeric_age_max", "double precision")
    .addColumn("numeric_age_unit", "text")
    .addColumn("numeric_age_years_unit", "text")
    .addColumn("geological_age_min", "text")
    .addColumn("geological_age_max", "text")
    .addColumn("geological_unit", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("numeric_age_min")
    .dropColumn("numeric_age_max")
    .dropColumn("numeric_age_unit")
    .dropColumn("numeric_age_years_unit")
    .dropColumn("geological_age_min")
    .dropColumn("geological_age_max")
    .dropColumn("geological_unit")
    .execute();
}

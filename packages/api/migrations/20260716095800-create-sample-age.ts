import { type Kysely } from "kysely";

// Geological age as a 0:1 side table: the sample id is the primary key and a
// cascading foreign key, so a sample has at most one age row and it is removed
// with the sample. Numeric ages are approximate measurements, so double
// precision; geological codes and units are stored as text.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sample_age")
    .addColumn("sample_id", "uuid", (col) =>
      col.primaryKey().references("sample.id").onDelete("cascade"),
    )
    .addColumn("numeric_age", "double precision")
    .addColumn("numeric_age_unit", "text")
    .addColumn("numeric_age_years_unit", "text")
    .addColumn("numeric_age_min", "double precision")
    .addColumn("numeric_age_min_unit", "text")
    .addColumn("numeric_age_min_years_unit", "text")
    .addColumn("numeric_age_max", "double precision")
    .addColumn("numeric_age_max_unit", "text")
    .addColumn("numeric_age_max_years_unit", "text")
    .addColumn("geological_age", "text")
    .addColumn("geological_age_min", "text")
    .addColumn("geological_age_max", "text")
    .addColumn("geological_unit", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("sample_age").execute();
}

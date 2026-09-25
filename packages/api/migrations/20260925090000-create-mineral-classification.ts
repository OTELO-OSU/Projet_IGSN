import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("mineral_classification")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addColumn("strunz_id", sql`ltree`, (col) => col.notNull())
    .addColumn("mindat_id", "integer")
    .addColumn("abundance", "text")
    .addUniqueConstraint(
      "mineral_classification_sample_row_unique",
      ["sample_id", "strunz_id", "mindat_id"],
      (constraint) => constraint.nullsNotDistinct(),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("mineral_classification").execute();
}

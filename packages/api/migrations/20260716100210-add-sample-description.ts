import { type Kysely, sql } from "kysely";

// Sample description (ADR 0015): flat nullable columns on sample, no side
// table. Dates are `date` (day-precise, no timezone); measurement values are
// double precision paired with a text unit code.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("collection_date_start", sql`date`)
    .addColumn("collection_date_end", sql`date`)
    .addColumn("oriented", sql`boolean`)
    .addColumn("orientation_explanation", sql`text`)
    .addColumn("open_description", sql`text`)
    .addColumn("length_value", sql`double precision`)
    .addColumn("length_unit", sql`text`)
    .addColumn("width_value", sql`double precision`)
    .addColumn("width_unit", sql`text`)
    .addColumn("thickness_value", sql`double precision`)
    .addColumn("thickness_unit", sql`text`)
    .addColumn("mass_value", sql`double precision`)
    .addColumn("mass_unit", sql`text`)
    .addColumn("volume_value", sql`double precision`)
    .addColumn("volume_unit", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("collection_date_start")
    .dropColumn("collection_date_end")
    .dropColumn("oriented")
    .dropColumn("orientation_explanation")
    .dropColumn("open_description")
    .dropColumn("length_value")
    .dropColumn("length_unit")
    .dropColumn("width_value")
    .dropColumn("width_unit")
    .dropColumn("thickness_value")
    .dropColumn("thickness_unit")
    .dropColumn("mass_value")
    .dropColumn("mass_unit")
    .dropColumn("volume_value")
    .dropColumn("volume_unit")
    .execute();
}

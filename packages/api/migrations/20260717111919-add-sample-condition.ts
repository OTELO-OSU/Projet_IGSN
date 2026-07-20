import { type Kysely, sql } from "kysely";

// Sample condition: flat nullable columns on sample, no side table, the same
// storage pattern as the description (ADR 0016). Vocabulary codes are text;
// numeric
// readings are double precision paired with a text unit code; the storage
// conditions multi-select is a text array.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("packaging", sql`text`)
    .addColumn("storage_conditions", sql`text[]`)
    .addColumn("temperature_type", sql`text`)
    .addColumn("temperature_value", sql`double precision`)
    .addColumn("temperature_unit", sql`text`)
    .addColumn("humidity_type", sql`text`)
    .addColumn("humidity_percentage", sql`double precision`)
    .addColumn("light", sql`text`)
    .addColumn("pressure_type", sql`text`)
    .addColumn("pressure_value", sql`double precision`)
    .addColumn("pressure_unit", sql`text`)
    .addColumn("specific_conditions", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("packaging")
    .dropColumn("storage_conditions")
    .dropColumn("temperature_type")
    .dropColumn("temperature_value")
    .dropColumn("temperature_unit")
    .dropColumn("humidity_type")
    .dropColumn("humidity_percentage")
    .dropColumn("light")
    .dropColumn("pressure_type")
    .dropColumn("pressure_value")
    .dropColumn("pressure_unit")
    .dropColumn("specific_conditions")
    .execute();
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("radioactivity", "boolean")
    .addColumn("radioactivity_explanation", sql`text`)
    .addColumn("asbestos_rich", "boolean")
    .addColumn("asbestos_explanation", sql`text`)
    .addColumn("chemical_risk", "boolean")
    .addColumn("chemical_risk_explanation", sql`text`)
    .addColumn("availability", sql`text`)
    .addColumn("publication_year", "integer")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("radioactivity")
    .dropColumn("radioactivity_explanation")
    .dropColumn("asbestos_rich")
    .dropColumn("asbestos_explanation")
    .dropColumn("chemical_risk")
    .dropColumn("chemical_risk_explanation")
    .dropColumn("availability")
    .dropColumn("publication_year")
    .execute();
}

import { type Kysely, sql } from "kysely";

// Sample security (safety hazards) and availability, flat nullable columns on
// the sample table, the same storage pattern as the condition (ADR 0016). Each
// hazard is a boolean flag paired with a free-text explanation. Availability is
// a two-value text code, null on a draft and required only at publish;
// publication_year is set once at publish, like igsn.
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

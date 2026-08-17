import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("economic_interest", sql`ltree`)
    .addColumn("economic_interest_elements", sql`text[]`)
    .addColumn("economic_resource_type_precision", sql`text`)
    .addColumn("economic_deposit_name", sql`text`)
    .addColumn("economic_deposit_description", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("economic_interest")
    .dropColumn("economic_interest_elements")
    .dropColumn("economic_resource_type_precision")
    .dropColumn("economic_deposit_name")
    .dropColumn("economic_deposit_description")
    .execute();
}

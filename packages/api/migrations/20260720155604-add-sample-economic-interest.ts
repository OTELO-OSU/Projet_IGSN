import { type Kysely, sql } from "kysely";

// Sample economic interest, flat columns on the sample table. `economic_interest`
// is a dot-path ltree rooted at the yes/no/unknown answer (resource type /
// deposit / uranium sub-type follow under `yes`, like the material and
// collection_method columns); `economic_interest_elements` is a text[] of
// chemical-element codes (like storage_conditions); the three text columns are
// free-text detail. All optional: economic interest never blocks publication.
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

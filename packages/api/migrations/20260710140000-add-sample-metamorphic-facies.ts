import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    // Metamorphic facies (a flat controlled vocabulary), not part of the material
    // tree, so a plain text column (no ltree). Nullable: only set for a
    // metamorphic material, null otherwise.
    .addColumn("metamorphic_facies", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("metamorphic_facies")
    .execute();
}

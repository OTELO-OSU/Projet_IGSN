import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    // Igneous texture (a flat controlled vocabulary), not part of the material
    // tree, so a plain text column (no ltree). Nullable: only set for a
    // plutonic/volcanic material, null otherwise.
    .addColumn("texture", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("sample").dropColumn("texture").execute();
}

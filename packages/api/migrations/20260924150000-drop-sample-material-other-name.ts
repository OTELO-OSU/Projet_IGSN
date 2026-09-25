import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE sample SET specific_name = material_other_name
    WHERE specific_name IS NULL AND material_other_name IS NOT NULL
  `.execute(db);
  await db.schema
    .alterTable("sample")
    .dropColumn("material_other_name")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("material_other_name", sql`text`)
    .execute();
}

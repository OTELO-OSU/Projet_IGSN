import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("material_other_name", sql`text`)
    .execute();
  await sql`DELETE FROM sample WHERE material = 'fossil'`.execute(db);
  await sql`
    DELETE FROM location
    WHERE NOT EXISTS (
      SELECT 1 FROM sample WHERE sample.location_id = location.id
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("material_other_name")
    .execute();
}

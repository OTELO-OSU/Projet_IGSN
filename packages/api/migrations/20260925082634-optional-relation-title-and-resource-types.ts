import { type Kysely, sql } from "kysely";

const TABLES = ["sample_relation", "sample_attachment"] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample_relation")
    .alterColumn("target_title", (col) => col.dropNotNull())
    .execute();
  for (const table of TABLES) {
    await sql`
      UPDATE ${sql.table(table)} SET target_resource_type = CASE target_resource_type
        WHEN 'output_management_plan' THEN 'sampling_management_plan'
        ELSE 'other'
      END
      WHERE target_resource_type IN ('output_management_plan', 'physical_object')
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of TABLES) {
    await sql`
      UPDATE ${sql.table(table)} SET target_resource_type = 'output_management_plan'
      WHERE target_resource_type = 'sampling_management_plan'
    `.execute(db);
    await sql`
      UPDATE ${sql.table(table)} SET target_resource_type = 'other'
      WHERE target_resource_type = 'field_notebook'
    `.execute(db);
  }
  await sql`
    UPDATE sample_relation SET target_title = '' WHERE target_title IS NULL
  `.execute(db);
  await db.schema
    .alterTable("sample_relation")
    .alterColumn("target_title", (col) => col.setNotNull())
    .execute();
}

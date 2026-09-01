import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("geological_context_description", "text")
    .addColumn("geomorphological_environment", sql`ltree`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("geological_context_description")
    .dropColumn("geomorphological_environment")
    .execute();
}

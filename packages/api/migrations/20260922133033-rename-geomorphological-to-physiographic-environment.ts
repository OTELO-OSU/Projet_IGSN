import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .renameColumn("geomorphological_environment", "physiographic_environment")
    .execute();
  await sql`update sample set physiographic_environment = null`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .renameColumn("physiographic_environment", "geomorphological_environment")
    .execute();
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .renameColumn("availability", "existence_status")
    .execute();
  await db.schema
    .alterTable("sample")
    .addColumn("availability_status", sql`text`)
    .execute();
  await sql`
    update sample
    set existence_status = 'lost', availability_status = 'not_available'
    where existence_status = 'no_longer_exists'
  `.execute(db);
  await sql`
    update sample set availability_status = 'available'
    where existence_status = 'exists'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update sample set existence_status = 'no_longer_exists'
    where existence_status <> 'exists'
  `.execute(db);
  await db.schema
    .alterTable("sample")
    .dropColumn("availability_status")
    .execute();
  await db.schema
    .alterTable("sample")
    .renameColumn("existence_status", "availability")
    .execute();
}

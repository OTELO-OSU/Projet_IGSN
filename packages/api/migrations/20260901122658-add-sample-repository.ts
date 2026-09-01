import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("rep_current_archive", sql`text`)
    .addColumn("rep_current_archive_contact", sql`text`)
    .addColumn("rep_collection_name", sql`text`)
    .addColumn("rep_original_archive", sql`text`)
    .addColumn("rep_original_archive_contact", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("rep_current_archive")
    .dropColumn("rep_current_archive_contact")
    .dropColumn("rep_collection_name")
    .dropColumn("rep_original_archive")
    .dropColumn("rep_original_archive_contact")
    .execute();
}

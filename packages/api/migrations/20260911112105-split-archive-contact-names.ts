import { type Kysely, sql } from "kysely";

const rename = (db: Kysely<unknown>, from: string, to: string) =>
  db.schema.alterTable("sample").renameColumn(from, to).execute();

export async function up(db: Kysely<unknown>): Promise<void> {
  await rename(
    db,
    "rep_current_archive_contact",
    "rep_current_archive_contact_lastname",
  );
  await rename(
    db,
    "rep_original_archive_contact",
    "rep_original_archive_contact_lastname",
  );
  await db.schema
    .alterTable("sample")
    .addColumn("rep_current_archive_contact_firstname", sql`text`)
    .addColumn("rep_original_archive_contact_firstname", sql`text`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .dropColumn("rep_current_archive_contact_firstname")
    .dropColumn("rep_original_archive_contact_firstname")
    .execute();
  await rename(
    db,
    "rep_current_archive_contact_lastname",
    "rep_current_archive_contact",
  );
  await rename(
    db,
    "rep_original_archive_contact_lastname",
    "rep_original_archive_contact",
  );
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("rep_current_archive_osu", sql`text`)
    .addColumn("rep_current_archive_laboratory", sql`text`)
    .addColumn("rep_rights_holder", sql`text[]`)
    .execute();
  await sql`update sample set rep_rights_holder = array[rep_current_archive] where rep_current_archive is not null`.execute(
    db,
  );
  await db.schema
    .alterTable("sample")
    .dropColumn("rep_current_archive")
    .dropColumn("rep_original_archive")
    .dropColumn("rep_original_archive_contact_firstname")
    .dropColumn("rep_original_archive_contact_lastname")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("rep_current_archive", sql`text`)
    .addColumn("rep_original_archive", sql`text`)
    .addColumn("rep_original_archive_contact_firstname", sql`text`)
    .addColumn("rep_original_archive_contact_lastname", sql`text`)
    .execute();
  await sql`update sample set rep_current_archive = rep_rights_holder[1] where rep_rights_holder is not null`.execute(
    db,
  );
  await db.schema
    .alterTable("sample")
    .dropColumn("rep_current_archive_osu")
    .dropColumn("rep_current_archive_laboratory")
    .dropColumn("rep_rights_holder")
    .execute();
}

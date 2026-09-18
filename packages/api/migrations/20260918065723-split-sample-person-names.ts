import { type Kysely, sql } from "kysely";

const RENAMED = [
  ["sc_chief_scientist", "sc_chief_scientist_lastname"],
  ["sc_collector_name", "sc_collector_lastname"],
  ["sc_collection_curator", "sc_collection_curator_lastname"],
  ["syn_operator_name", "syn_operator_lastname"],
] as const;

const SPLIT = [
  "sc_chief_scientist",
  "sc_collector",
  "sc_collection_curator",
  "syn_operator",
  "rep_current_archive_contact",
  "rep_original_archive_contact",
] as const;

const rename = (db: Kysely<unknown>, from: string, to: string) =>
  db.schema.alterTable("sample").renameColumn(from, to).execute();

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const [from, to] of RENAMED) await rename(db, from, to);
  await db.schema
    .alterTable("sample")
    .addColumn("sc_chief_scientist_firstname", sql`text`)
    .addColumn("sc_collector_firstname", sql`text`)
    .addColumn("sc_collection_curator_firstname", sql`text`)
    .addColumn("syn_operator_firstname", sql`text`)
    .execute();
  for (const column of SPLIT) {
    const last = sql.ref(`${column}_lastname`);
    await sql`
      update sample
      set ${sql.ref(`${column}_firstname`)} = left(${last}, strpos(${last}, ' ') - 1),
          ${sql.ref(`${column}_lastname`)} = substr(${last}, strpos(${last}, ' ') + 1)
      where strpos(${last}, ' ') > 0
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of SPLIT) {
    await sql`
      update sample
      set ${sql.ref(`${column}_lastname`)} = concat_ws(' ', ${sql.ref(`${column}_firstname`)}, ${sql.ref(`${column}_lastname`)}),
          ${sql.ref(`${column}_firstname`)} = null
      where ${sql.ref(`${column}_firstname`)} is not null
    `.execute(db);
  }
  await db.schema
    .alterTable("sample")
    .dropColumn("sc_chief_scientist_firstname")
    .dropColumn("sc_collector_firstname")
    .dropColumn("sc_collection_curator_firstname")
    .dropColumn("syn_operator_firstname")
    .execute();
  for (const [from, to] of RENAMED) await rename(db, to, from);
}

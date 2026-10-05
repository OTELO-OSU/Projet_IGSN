import { type Kysely, sql } from "kysely";

const renameCode = (db: Kysely<unknown>, from: string, to: string) =>
  sql`
    update sample set sc_provenance_status = ${to}
    where sc_provenance_status = ${from}
  `.execute(db);

export async function up(db: Kysely<unknown>): Promise<void> {
  await renameCode(db, "field_sample", "research_project_sample");
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await renameCode(db, "research_project_sample", "field_sample");
}

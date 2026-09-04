import { type Kysely, sql } from "kysely";

const renameCode = (db: Kysely<unknown>, from: string, to: string) =>
  sql`
    update sample set sc_provenance_status = ${to}
    where sc_provenance_status = ${from}
  `.execute(db);

export async function up(db: Kysely<unknown>): Promise<void> {
  await renameCode(db, "recent_collection", "field_sample");
  await renameCode(db, "historical_specimen", "collection_specimen");
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await renameCode(db, "field_sample", "recent_collection");
  await renameCode(db, "collection_specimen", "historical_specimen");
}

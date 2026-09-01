import { type Kysely, sql } from "kysely";

const rename = (db: Kysely<unknown>, from: string, to: string) =>
  db.schema.alterTable("sample").renameColumn(from, to).execute();

export async function up(db: Kysely<unknown>): Promise<void> {
  await rename(db, "sc_research_structure", "sc_host_institution");
  await rename(db, "sc_research_program_chief", "sc_chief_scientist");
  await rename(
    db,
    "sc_research_program_chief_orcid",
    "sc_chief_scientist_orcid",
  );
  // ponytail: the 'other' collection origin is gone from the domain enum, so this rewrite is one-way.
  await sql`
    update sample set sc_collection_origin = 'unknown_origin'
    where sc_collection_origin = 'other'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await rename(db, "sc_host_institution", "sc_research_structure");
  await rename(db, "sc_chief_scientist", "sc_research_program_chief");
  await rename(
    db,
    "sc_chief_scientist_orcid",
    "sc_research_program_chief_orcid",
  );
}

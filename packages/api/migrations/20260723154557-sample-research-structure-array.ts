import { type Kysely, sql } from "kysely";

// `sc_research_structure` becomes multi-valued: the chief may belong to several
// structures. text -> text[], wrapping any existing scalar in a one-element
// array (null stays null; "not filled" is null, never []).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    alter column sc_research_structure type text[]
    using case
      when sc_research_structure is null then null
      else array[sc_research_structure]
    end
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    alter column sc_research_structure type text
    using sc_research_structure[1]
  `.execute(db);
}

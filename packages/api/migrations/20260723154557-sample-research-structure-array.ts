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

// Lossy on rollback: text[] -> text keeps only the first structure
// (`[1]`, Postgres arrays are 1-indexed), so any extra structures a sample
// gained under the array schema are dropped. Acceptable for a down migration;
// no way to fit many values back into one scalar column.
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    alter column sc_research_structure type text
    using sc_research_structure[1]
  `.execute(db);
}

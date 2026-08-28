import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    rename column sc_funder_organization to sc_funder_organizations
  `.execute(db);
  await sql`
    alter table sample
    alter column sc_funder_organizations type text[]
    using case
      when sc_funder_organizations is null then null
      else array[sc_funder_organizations]
    end
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table sample
    alter column sc_funder_organizations type text
    using sc_funder_organizations[1]
  `.execute(db);
  await sql`
    alter table sample
    rename column sc_funder_organizations to sc_funder_organization
  `.execute(db);
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update location set region_kind = 'country' where region_kind = 'continent'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update location set region_kind = 'continent' where region_kind = 'country'
  `.execute(db);
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update sample set material = 'rock_and_sediment'::ltree || material
    where material is not null
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update sample set material = subpath(material, 1) where material is not null
  `.execute(db);
}

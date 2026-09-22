import { type Kysely, sql } from "kysely";

const renameNature = (db: Kysely<unknown>, from: string, to: string) =>
  sql`
    update sample set nature = ${to}
    where nature = ${from}
  `.execute(db);

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sample")
    .addColumn("local_id", "text")
    .addColumn("local_id_description", "text")
    .execute();
  await sql`
    CREATE INDEX sample_local_id_trgm_idx ON sample
      USING gin (public.immutable_unaccent(coalesce(local_id, '')) gin_trgm_ops)
  `.execute(db);
  await renameNature(db, "rock_powder", "powder");
  await renameNature(db, "separated_materials", "separated_minerals");
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await renameNature(db, "powder", "rock_powder");
  await renameNature(db, "separated_minerals", "separated_materials");
  await sql`DROP INDEX sample_local_id_trgm_idx`.execute(db);
  await db.schema
    .alterTable("sample")
    .dropColumn("local_id")
    .dropColumn("local_id_description")
    .execute();
}

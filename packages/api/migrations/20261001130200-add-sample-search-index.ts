import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE INDEX sample_search_idx ON sample USING paradedb (
      id,
      (status::pdb.literal),
      (nature::pdb.literal),
      (institutional_organization::pdb.literal),
      (institutional_osu::pdb.literal),
      (institutional_laboratory::pdb.literal),
      (sc_host_institution::pdb.literal),
      (type_paths::pdb.literal),
      (material_paths::pdb.literal),
      (collection_method_paths::pdb.literal),
      (mineral_classification_paths::pdb.literal),
      (manual_group_ids::pdb.literal),
      (contributor_ids::pdb.literal),
      is_sub_sample,
      annum_min,
      annum_max
    ) WITH (key_field = 'id')
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX sample_search_idx`.execute(db);
}

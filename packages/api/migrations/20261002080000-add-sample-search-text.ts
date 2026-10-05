import { type Kysely, sql } from "kysely";

const SEARCHED_COLUMNS = ["name", "specific_name", "local_id"] as const;

const FACET_FIELDS = sql`
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
  annum_max`;

const createSearchIndex = (
  db: Kysely<unknown>,
  fields: ReturnType<typeof sql>,
) =>
  sql`CREATE INDEX sample_search_idx ON sample USING paradedb (${fields}) WITH (key_field = 'id')`.execute(
    db,
  );

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX sample_search_idx`.execute(db);
  await createSearchIndex(
    db,
    sql`${FACET_FIELDS},
      ${sql.join(
        SEARCHED_COLUMNS.map(
          (column) =>
            sql`((${sql.ref(`${column}_unaccented`)})::pdb.whitespace('lowercase=true'))`,
        ),
      )},
      ((igsn)::pdb.literal)`,
  );
  for (const column of SEARCHED_COLUMNS) {
    await sql`DROP INDEX ${sql.raw(`sample_${column}_trgm_idx`)}`.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const column of SEARCHED_COLUMNS) {
    await sql`
      CREATE INDEX ${sql.raw(`sample_${column}_trgm_idx`)} ON sample
        USING gin (${sql.ref(`${column}_unaccented`)} gin_trgm_ops)
    `.execute(db);
  }
  await sql`DROP INDEX sample_search_idx`.execute(db);
  await createSearchIndex(db, FACET_FIELDS);
}

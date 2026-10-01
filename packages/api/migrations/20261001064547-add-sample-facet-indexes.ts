import { type Kysely, sql } from "kysely";

const INDEXES = [
  ["sample_nature_idx", sql`sample USING btree (nature)`],
  [
    "sample_institutional_organization_idx",
    sql`sample USING btree (institutional_organization)`,
  ],
  ["sample_institutional_osu_idx", sql`sample USING btree (institutional_osu)`],
  [
    "sample_institutional_laboratory_idx",
    sql`sample USING btree (institutional_laboratory)`,
  ],
  ["sample_type_idx", sql`sample USING gist ("type")`],
  ["sample_collection_method_idx", sql`sample USING gist (collection_method)`],
  [
    "mineral_classification_strunz_id_idx",
    sql`mineral_classification USING gist (strunz_id)`,
  ],
  [
    "sample_sc_host_institution_idx",
    sql`sample USING gin (sc_host_institution)`,
  ],
] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const [name, target] of INDEXES) {
    await sql`CREATE INDEX ${sql.raw(name)} ON ${target}`.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const [name] of INDEXES) {
    await sql`DROP INDEX ${sql.raw(name)}`.execute(db);
  }
}

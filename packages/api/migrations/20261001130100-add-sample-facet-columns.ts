import { type Kysely, sql } from "kysely";

const LINK_COLUMNS = sql`
  is_sub_sample = exists (
    select 1 from sample_parent where sample_parent.sample_id = sample.id
  ),
  manual_group_ids = array(
    select group_id::text from sample_manual_group
     where sample_manual_group.sample_id = sample.id
  ),
  contributor_ids = array(
    select distinct user_id::text from user_sample
     where user_sample.sample_id = sample.id
  ),
  mineral_classification_paths = array(
    select distinct path from mineral_classification
     cross join unnest(ltree_ancestor_paths(strunz_id)) as path
     where mineral_classification.sample_id = sample.id
  )`;

const LINK_TABLES = [
  "sample_parent",
  "sample_manual_group",
  "user_sample",
  "mineral_classification",
];

const PATH_COLUMNS = [
  ["type_paths", "type"],
  ["material_paths", "material"],
  ["collection_method_paths", "collection_method"],
] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE FUNCTION ltree_ancestor_paths(path ltree) RETURNS text[]
    LANGUAGE sql IMMUTABLE STRICT SET search_path = public
    AS $$
      select array(select subpath(path, 0, depth)::text from generate_series(1, nlevel(path)) as depth)
    $$
  `.execute(db);
  for (const [column, source] of PATH_COLUMNS) {
    await sql`ALTER TABLE sample ADD COLUMN ${sql.raw(column)} text[] GENERATED ALWAYS AS (ltree_ancestor_paths(${sql.raw(source)})) STORED`.execute(
      db,
    );
  }
  await sql`
    ALTER TABLE sample
      ADD COLUMN is_sub_sample boolean NOT NULL DEFAULT false,
      ADD COLUMN manual_group_ids text[] NOT NULL DEFAULT '{}',
      ADD COLUMN contributor_ids text[] NOT NULL DEFAULT '{}',
      ADD COLUMN mineral_classification_paths text[] NOT NULL DEFAULT '{}',
      ADD COLUMN location_geom geometry(Geometry, 4326)
  `.execute(db);
  await sql`UPDATE sample SET ${LINK_COLUMNS}`.execute(db);
  await sql`
    UPDATE sample SET location_geom = location.geom
      FROM location WHERE location.id = sample.location_id
  `.execute(db);
  await sql`CREATE INDEX sample_location_geom_gist ON sample USING gist (location_geom)`.execute(
    db,
  );

  await sql`
    CREATE FUNCTION refresh_sample_links() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP <> 'INSERT' THEN
        UPDATE sample SET ${LINK_COLUMNS} WHERE sample.id = OLD.sample_id;
      END IF;
      IF TG_OP <> 'DELETE' THEN
        UPDATE sample SET ${LINK_COLUMNS} WHERE sample.id = NEW.sample_id;
      END IF;
      RETURN NULL;
    END
    $$
  `.execute(db);
  for (const table of LINK_TABLES) {
    await sql`
      CREATE TRIGGER ${sql.raw(`${table}_refresh_sample_links`)}
      AFTER INSERT OR UPDATE OR DELETE ON ${sql.table(table)}
      FOR EACH ROW EXECUTE FUNCTION refresh_sample_links()
    `.execute(db);
  }

  await sql`
    CREATE FUNCTION copy_sample_location_geom() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.location_geom := (SELECT geom FROM location WHERE id = NEW.location_id);
      RETURN NEW;
    END
    $$
  `.execute(db);
  await sql`
    CREATE TRIGGER sample_copy_location_geom
    BEFORE INSERT OR UPDATE OF location_id ON sample
    FOR EACH ROW EXECUTE FUNCTION copy_sample_location_geom()
  `.execute(db);
  await sql`
    CREATE FUNCTION spread_location_geom() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE sample SET location_geom = NEW.geom WHERE location_id = NEW.id;
      RETURN NULL;
    END
    $$
  `.execute(db);
  await sql`
    CREATE TRIGGER location_spread_geom
    AFTER UPDATE ON location
    FOR EACH ROW EXECUTE FUNCTION spread_location_geom()
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER location_spread_geom ON location`.execute(db);
  await sql`DROP FUNCTION spread_location_geom`.execute(db);
  await sql`DROP TRIGGER sample_copy_location_geom ON sample`.execute(db);
  await sql`DROP FUNCTION copy_sample_location_geom`.execute(db);
  for (const table of LINK_TABLES) {
    await sql`DROP TRIGGER ${sql.raw(`${table}_refresh_sample_links`)} ON ${sql.table(table)}`.execute(
      db,
    );
  }
  await sql`DROP FUNCTION refresh_sample_links`.execute(db);
  await sql`
    ALTER TABLE sample
      DROP COLUMN location_geom,
      DROP COLUMN mineral_classification_paths,
      DROP COLUMN contributor_ids,
      DROP COLUMN manual_group_ids,
      DROP COLUMN is_sub_sample,
      DROP COLUMN collection_method_paths,
      DROP COLUMN material_paths,
      DROP COLUMN type_paths
  `.execute(db);
  await sql`DROP FUNCTION ltree_ancestor_paths`.execute(db);
}

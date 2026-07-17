import { type Kysely, sql } from "kysely";

// Fold the 1:1 location table (ADR 0014) into sample. Location data is
// dropped, not copied (acceptable at this stage). `type` is renamed
// `location_type`: sample already has a `type` (taxonomy path). The generated,
// GiST-indexed `geom` geography moves along for spatial search. Raw SQL: the
// generated geography column is beyond the Kysely schema builder.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE location`.execute(db);
  await sql`
    ALTER TABLE sample
      ADD COLUMN location_type text,
      ADD COLUMN point_longitude double precision,
      ADD COLUMN point_latitude double precision,
      ADD COLUMN area_west_longitude double precision,
      ADD COLUMN area_east_longitude double precision,
      ADD COLUMN area_south_latitude double precision,
      ADD COLUMN area_north_latitude double precision,
      ADD COLUMN elevation_min integer,
      ADD COLUMN elevation_max integer,
      ADD COLUMN elevation_unit text,
      ADD COLUMN vertical_datum text,
      ADD COLUMN navigation_type text,
      ADD COLUMN region_kind text,
      ADD COLUMN country text,
      ADD COLUMN ocean_sea text,
      ADD COLUMN locality_name text,
      ADD COLUMN locality_description text,
      ADD COLUMN geom geography(Geometry, 4326) GENERATED ALWAYS AS (
        CASE location_type
          WHEN 'point' THEN ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326)::geography
          WHEN 'area' THEN ST_MakeEnvelope(area_west_longitude, area_south_latitude, area_east_longitude, area_north_latitude, 4326)::geography
          ELSE NULL
        END
      ) STORED
  `.execute(db);
  await sql`CREATE INDEX sample_geom_gist ON sample USING gist (geom)`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN geom,
      DROP COLUMN location_type,
      DROP COLUMN point_longitude,
      DROP COLUMN point_latitude,
      DROP COLUMN area_west_longitude,
      DROP COLUMN area_east_longitude,
      DROP COLUMN area_south_latitude,
      DROP COLUMN area_north_latitude,
      DROP COLUMN elevation_min,
      DROP COLUMN elevation_max,
      DROP COLUMN elevation_unit,
      DROP COLUMN vertical_datum,
      DROP COLUMN navigation_type,
      DROP COLUMN region_kind,
      DROP COLUMN country,
      DROP COLUMN ocean_sea,
      DROP COLUMN locality_name,
      DROP COLUMN locality_description
  `.execute(db);
  await sql`
    CREATE TABLE location (
      sample_id uuid PRIMARY KEY REFERENCES sample(id) ON DELETE CASCADE,
      type text,
      point_longitude double precision,
      point_latitude double precision,
      area_west_longitude double precision,
      area_east_longitude double precision,
      area_south_latitude double precision,
      area_north_latitude double precision,
      elevation_min integer,
      elevation_max integer,
      elevation_unit text,
      vertical_datum text,
      navigation_type text,
      region_kind text,
      country text,
      ocean_sea text,
      locality_name text,
      locality_description text,
      geom geography(Geometry, 4326) GENERATED ALWAYS AS (
        CASE type
          WHEN 'point' THEN ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326)::geography
          WHEN 'area' THEN ST_MakeEnvelope(area_west_longitude, area_south_latitude, area_east_longitude, area_north_latitude, 4326)::geography
          ELSE NULL
        END
      ) STORED
    )
  `.execute(db);
  await sql`CREATE INDEX location_geom_gist ON location USING gist (geom)`.execute(
    db,
  );
}

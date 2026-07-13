import { type Kysely, sql } from "kysely";

// A sample's geographic location (ADR 0014), 1:1 with sample. The raw coordinate
// columns are the CRUD source of truth; `geom` is a generated, GiST-indexed
// geography derived from them for spatial search (point, area, or null for a
// locality-only row). A dateline-crossing area (west > east) is built correctly
// by ST_MakeEnvelope(...)::geography, which keeps the ≤180° interior. Written as
// raw SQL: the generated geography column is beyond the Kysely schema builder.
export async function up(db: Kysely<unknown>): Promise<void> {
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
      elevation double precision,
      elevation_min double precision,
      elevation_max double precision,
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

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE location`.execute(db);
}

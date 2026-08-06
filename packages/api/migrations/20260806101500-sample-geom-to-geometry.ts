import { type Kysely, sql } from "kysely";

// `geom` becomes planar geometry (ADR 0014, amended): a geography envelope has
// great-circle edges, so a wide search box bows poleward and silently drops
// results, and past 180 degrees of width the match inverts. There is no in-place
// path (ALTER COLUMN ... TYPE refuses it on a generated column, with or without
// USING), so the column is dropped and re-added; nothing is lost, `geom` is
// derived from the raw lon/lat columns.
//
// The inner CASE is required, do not simplify it: planar, a single envelope for a
// dateline-crossing area (west > east) is its complement, spanning east..west the
// wrong way round. Such an area is valid data, so it is stored as the two halves
// split at 180. ST_Collect is IMMUTABLE, hence legal here, and yields a
// MultiPolygon, which the generic geometry(Geometry, 4326) type accepts.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN geom,
      ADD COLUMN geom geometry(Geometry, 4326) GENERATED ALWAYS AS (
        CASE location_type
          WHEN 'point' THEN ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326)
          WHEN 'area' THEN
            CASE WHEN area_west_longitude > area_east_longitude
              THEN ST_Collect(
                     ST_MakeEnvelope(area_west_longitude, area_south_latitude, 180, area_north_latitude, 4326),
                     ST_MakeEnvelope(-180, area_south_latitude, area_east_longitude, area_north_latitude, 4326))
              ELSE ST_MakeEnvelope(area_west_longitude, area_south_latitude, area_east_longitude, area_north_latitude, 4326)
            END
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

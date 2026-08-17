import { type Kysely, sql } from "kysely";

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

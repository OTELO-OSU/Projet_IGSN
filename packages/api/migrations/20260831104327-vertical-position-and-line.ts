import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      DROP COLUMN geom,
      ADD COLUMN vertical_position double precision,
      ADD COLUMN vertical_reference text,
      ADD COLUMN line_start_longitude double precision,
      ADD COLUMN line_start_latitude double precision,
      ADD COLUMN line_start_vertical_position double precision,
      ADD COLUMN line_end_longitude double precision,
      ADD COLUMN line_end_latitude double precision,
      ADD COLUMN line_end_vertical_position double precision
  `.execute(db);
  await sql`
    UPDATE sample SET
      elevation_min = elevation_min * 1000,
      elevation_max = elevation_max * 1000
    WHERE elevation_unit = 'km'
  `.execute(db);
  await sql`
    UPDATE sample SET
      vertical_reference = CASE
        WHEN GREATEST(elevation_min, elevation_max) <= 0 THEN 'bathymetry'
        WHEN LEAST(elevation_min, elevation_max) >= 0 THEN 'elevation'
        ELSE 'other'
      END,
      elevation_min = CASE
        WHEN elevation_min IS NULL OR elevation_max IS NULL THEN ABS(elevation_min)
        WHEN LEAST(elevation_min, elevation_max) < 0 AND GREATEST(elevation_min, elevation_max) > 0 THEN 0
        ELSE LEAST(ABS(elevation_min), ABS(elevation_max))
      END,
      elevation_max = CASE
        WHEN elevation_min IS NULL OR elevation_max IS NULL THEN ABS(elevation_max)
        ELSE GREATEST(ABS(elevation_min), ABS(elevation_max))
      END
    WHERE elevation_min IS NOT NULL OR elevation_max IS NOT NULL
  `.execute(db);
  await sql`
    UPDATE sample SET vertical_datum = 'unknown'
    WHERE vertical_datum IN ('wgs84', 'grs80')
  `.execute(db);
  await sql`
    UPDATE sample SET
      vertical_position = COALESCE(elevation_min, elevation_max),
      elevation_min = NULL,
      elevation_max = NULL
    WHERE location_type = 'point'
  `.execute(db);
  await sql`ALTER TABLE sample DROP COLUMN elevation_unit`.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN elevation_min TO vertical_position_min
  `.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN elevation_max TO vertical_position_max
  `.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN vertical_datum TO vertical_reference_system
  `.execute(db);
  // ponytail: a line straddling the antimeridian is drawn the long way round, segmentize it if such data appears.
  await sql`
    ALTER TABLE sample
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
          WHEN 'line' THEN ST_SetSRID(ST_MakeLine(ST_MakePoint(line_start_longitude, line_start_latitude), ST_MakePoint(line_end_longitude, line_end_latitude)), 4326)
          ELSE NULL
        END
      ) STORED
  `.execute(db);
  await sql`CREATE INDEX sample_geom_gist ON sample USING gist (geom)`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE sample DROP COLUMN geom`.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN vertical_position_min TO elevation_min
  `.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN vertical_position_max TO elevation_max
  `.execute(db);
  await sql`
    ALTER TABLE sample
      RENAME COLUMN vertical_reference_system TO vertical_datum
  `.execute(db);
  await sql`ALTER TABLE sample ADD COLUMN elevation_unit text`.execute(db);
  await sql`
    UPDATE sample SET
      elevation_min = COALESCE(elevation_min, vertical_position),
      elevation_max = COALESCE(elevation_max, vertical_position)
    WHERE vertical_position IS NOT NULL
  `.execute(db);
  await sql`
    UPDATE sample SET
      elevation_min = -elevation_max,
      elevation_max = -elevation_min
    WHERE vertical_reference IN ('bathymetry', 'depth_below_ground', 'depth_below_sea_floor', 'core_depth')
  `.execute(db);
  await sql`
    UPDATE sample SET elevation_unit = 'm'
    WHERE elevation_min IS NOT NULL OR elevation_max IS NOT NULL
  `.execute(db);
  await sql`
    UPDATE sample SET location_type = NULL, navigation_type = NULL
    WHERE location_type = 'line'
  `.execute(db);
  await sql`
    ALTER TABLE sample
      DROP COLUMN vertical_position,
      DROP COLUMN vertical_reference,
      DROP COLUMN line_start_longitude,
      DROP COLUMN line_start_latitude,
      DROP COLUMN line_start_vertical_position,
      DROP COLUMN line_end_longitude,
      DROP COLUMN line_end_latitude,
      DROP COLUMN line_end_vertical_position
  `.execute(db);
  await sql`
    ALTER TABLE sample
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

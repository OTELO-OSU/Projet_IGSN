import { type Kysely, sql } from "kysely";

const COLUMNS = [
  "location_type",
  "point_longitude",
  "point_latitude",
  "area_west_longitude",
  "area_east_longitude",
  "area_south_latitude",
  "area_north_latitude",
  "line_start_longitude",
  "line_start_latitude",
  "line_end_longitude",
  "line_end_latitude",
  "vertical_position",
  "vertical_position_min",
  "vertical_position_max",
  "line_start_vertical_position",
  "line_end_vertical_position",
  "vertical_reference",
  "vertical_reference_system",
  "navigation_type",
  "region_kind",
  "country",
  "ocean_sea",
  "locality_name",
  "locality_description",
];

const columnList = sql.raw(COLUMNS.join(", "));
const hasLocation = sql`num_nonnulls(${columnList}) > 0`;

export async function up(db: Kysely<unknown>): Promise<void> {
  // ponytail: a line straddling the antimeridian is drawn the long way round, segmentize it if such data appears.
  await sql`
    CREATE TABLE location (
      id uuid PRIMARY KEY,
      location_type text,
      point_longitude double precision,
      point_latitude double precision,
      area_west_longitude double precision,
      area_east_longitude double precision,
      area_south_latitude double precision,
      area_north_latitude double precision,
      line_start_longitude double precision,
      line_start_latitude double precision,
      line_end_longitude double precision,
      line_end_latitude double precision,
      vertical_position double precision,
      vertical_position_min double precision,
      vertical_position_max double precision,
      line_start_vertical_position double precision,
      line_end_vertical_position double precision,
      vertical_reference text,
      vertical_reference_system text,
      navigation_type text,
      region_kind text,
      country text,
      ocean_sea text,
      locality_name text,
      locality_description text,
      geom geometry(Geometry, 4326) GENERATED ALWAYS AS (
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
    )
  `.execute(db);
  await sql`CREATE INDEX location_geom_gist ON location USING gist (geom)`.execute(
    db,
  );
  await sql`
    ALTER TABLE sample ADD COLUMN location_id uuid REFERENCES location(id)
  `.execute(db);
  await sql`
    INSERT INTO location (id, ${columnList})
    SELECT id, ${columnList} FROM sample WHERE ${hasLocation}
  `.execute(db);
  await sql`UPDATE sample SET location_id = id WHERE ${hasLocation}`.execute(
    db,
  );
  await sql`
    ALTER TABLE sample
      DROP COLUMN geom,
      ${sql.raw(COLUMNS.map((column) => `DROP COLUMN ${column}`).join(", "))}
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ADD COLUMN location_type text,
      ADD COLUMN point_longitude double precision,
      ADD COLUMN point_latitude double precision,
      ADD COLUMN area_west_longitude double precision,
      ADD COLUMN area_east_longitude double precision,
      ADD COLUMN area_south_latitude double precision,
      ADD COLUMN area_north_latitude double precision,
      ADD COLUMN line_start_longitude double precision,
      ADD COLUMN line_start_latitude double precision,
      ADD COLUMN line_end_longitude double precision,
      ADD COLUMN line_end_latitude double precision,
      ADD COLUMN vertical_position double precision,
      ADD COLUMN vertical_position_min double precision,
      ADD COLUMN vertical_position_max double precision,
      ADD COLUMN line_start_vertical_position double precision,
      ADD COLUMN line_end_vertical_position double precision,
      ADD COLUMN vertical_reference text,
      ADD COLUMN vertical_reference_system text,
      ADD COLUMN navigation_type text,
      ADD COLUMN region_kind text,
      ADD COLUMN country text,
      ADD COLUMN ocean_sea text,
      ADD COLUMN locality_name text,
      ADD COLUMN locality_description text
  `.execute(db);
  await sql`
    UPDATE sample SET (${columnList}) = (
      SELECT ${columnList} FROM location WHERE location.id = sample.location_id
    )
    WHERE location_id IS NOT NULL
  `.execute(db);
  await sql`ALTER TABLE sample DROP COLUMN location_id`.execute(db);
  await sql`DROP TABLE location`.execute(db);
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

import { type Kysely, sql } from "kysely";

const VERTICAL_COLUMNS = [
  "vertical_position",
  "vertical_position_min",
  "vertical_position_max",
  "line_start_vertical_position",
  "line_end_vertical_position",
  "vertical_reference",
  "vertical_reference_system",
];

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("location_vertical_position")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("location_id", "uuid", (col) =>
      col.notNull().references("location.id").onDelete("cascade"),
    )
    .addColumn("reference", "text")
    .addColumn("system", "text")
    .addColumn("start_value", "double precision")
    .addColumn("end_value", "double precision")
    .addUniqueConstraint("location_vertical_position_reference_unique", [
      "location_id",
      "reference",
    ])
    .execute();
  await sql`
    INSERT INTO location_vertical_position
      (id, location_id, reference, system, start_value, end_value)
    SELECT
      id,
      id,
      vertical_reference,
      vertical_reference_system,
      coalesce(vertical_position, vertical_position_min, line_start_vertical_position),
      coalesce(vertical_position, vertical_position_max, line_end_vertical_position)
    FROM location
    WHERE num_nonnulls(${sql.raw(VERTICAL_COLUMNS.join(", "))}) > 0
  `.execute(db);
  await sql`
    ALTER TABLE location
      ${sql.raw(VERTICAL_COLUMNS.map((column) => `DROP COLUMN ${column}`).join(", "))}
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE location
      ADD COLUMN vertical_position double precision,
      ADD COLUMN vertical_position_min double precision,
      ADD COLUMN vertical_position_max double precision,
      ADD COLUMN line_start_vertical_position double precision,
      ADD COLUMN line_end_vertical_position double precision,
      ADD COLUMN vertical_reference text,
      ADD COLUMN vertical_reference_system text
  `.execute(db);
  await sql`
    UPDATE location SET
      vertical_position = CASE WHEN location_type = 'point' THEN coalesce(first.start_value, first.end_value) END,
      vertical_position_min = CASE WHEN location_type = 'area' THEN first.start_value END,
      vertical_position_max = CASE WHEN location_type = 'area' THEN first.end_value END,
      line_start_vertical_position = CASE WHEN location_type = 'line' THEN first.start_value END,
      line_end_vertical_position = CASE WHEN location_type = 'line' THEN first.end_value END,
      vertical_reference = first.reference,
      vertical_reference_system = first.system
    FROM (
      SELECT DISTINCT ON (location_id) *
      FROM location_vertical_position
      ORDER BY location_id, id
    ) AS first
    WHERE first.location_id = location.id
  `.execute(db);
  await db.schema.dropTable("location_vertical_position").execute();
}

import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN elevation_min TYPE double precision,
      ALTER COLUMN elevation_max TYPE double precision
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE sample
      ALTER COLUMN elevation_min TYPE integer USING ROUND(elevation_min)::integer,
      ALTER COLUMN elevation_max TYPE integer USING ROUND(elevation_max)::integer
  `.execute(db);
}

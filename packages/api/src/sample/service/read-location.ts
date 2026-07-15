import type { Location } from "@projet-igsn/domain/sample/location/model";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toLocation } from "./to-location.ts";

// Every location column except the generated `geom` (geography WKB, useless to
// the app and never selected).
const LOCATION_COLUMNS = [
  "sample_id",
  "type",
  "point_longitude",
  "point_latitude",
  "area_west_longitude",
  "area_east_longitude",
  "area_south_latitude",
  "area_north_latitude",
  "elevation_min",
  "elevation_max",
  "elevation_unit",
  "vertical_datum",
  "navigation_type",
  "region_kind",
  "country",
  "ocean_sea",
  "locality_name",
  "locality_description",
] as const;

export async function readLocation(
  db: Transactional<DB>,
  sampleId: string,
): Promise<Location | null> {
  const row = await db
    .selectFrom("location")
    .select(LOCATION_COLUMNS)
    .where("sample_id", "=", sampleId)
    .executeTakeFirst();
  return toLocation(row);
}

// Batch read for a page of samples, so a list never issues one query per row.
export async function readLocations(
  db: Transactional<DB>,
  sampleIds: string[],
): Promise<Map<string, Location>> {
  const byId = new Map<string, Location>();
  if (sampleIds.length === 0) return byId;
  const rows = await db
    .selectFrom("location")
    .select(LOCATION_COLUMNS)
    .where("sample_id", "in", sampleIds)
    .execute();
  for (const row of rows) {
    const location = toLocation(row);
    if (location) byId.set(row.sample_id, location);
  }
  return byId;
}

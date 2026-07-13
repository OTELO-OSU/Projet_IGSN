import type { Insertable, Selectable } from "kysely";

import {
  type Location,
  locationSchema,
} from "@projet-igsn/domain/sample/location/model";

import type { DB } from "../../db.ts";

// The location row minus the DB-generated geography (never read into the app).
type LocationRow = Omit<Selectable<DB["location"]>, "geom">;

// DB row (snake_case, flat) -> domain Location (nested), validated at the
// boundary. `undefined` (no row) maps to null: the sample has no location.
// Absent fields are omitted rather than set to null, so a stored location
// round-trips to the same minimal shape the client sent.
export function toLocation(row: LocationRow | undefined): Location | null {
  if (!row) return null;
  const position = toPosition(row);
  const region = toRegion(row);
  return locationSchema.parse({
    ...(position ? { position } : {}),
    ...(region ? { region } : {}),
    ...(row.navigation_type !== null
      ? { navigationType: row.navigation_type }
      : {}),
    ...(row.locality_name !== null ? { localityName: row.locality_name } : {}),
    ...(row.locality_description !== null
      ? { localityDescription: row.locality_description }
      : {}),
  });
}

// Signed elevation range (min === max for a point), or omitted when absent.
function toElevation(row: LocationRow) {
  if (row.elevation_min === null || row.elevation_max === null) return {};
  return {
    elevation: {
      min: row.elevation_min,
      max: row.elevation_max,
      unit: row.elevation_unit,
      datum: row.vertical_datum,
    },
  };
}

function toPosition(row: LocationRow) {
  if (row.type === "point") {
    return {
      type: "point",
      longitude: row.point_longitude,
      latitude: row.point_latitude,
      ...toElevation(row),
    };
  }
  if (row.type === "area") {
    return {
      type: "area",
      westLongitude: row.area_west_longitude,
      eastLongitude: row.area_east_longitude,
      southLatitude: row.area_south_latitude,
      northLatitude: row.area_north_latitude,
      ...toElevation(row),
    };
  }
  return null;
}

function toRegion(row: LocationRow) {
  if (row.region_kind === "continent") {
    return { kind: "continent", country: row.country };
  }
  if (row.region_kind === "ocean") {
    return { kind: "ocean", oceanSea: row.ocean_sea };
  }
  return null;
}

// domain Location -> flat insertable columns. `geom` is DB-generated and omitted.
export function toLocationValues(
  sampleId: string,
  location: Location,
): Insertable<DB["location"]> {
  const position = location.position ?? null;
  const point = position?.type === "point" ? position : null;
  const area = position?.type === "area" ? position : null;
  const elevation = position?.elevation ?? null;
  const region = location.region ?? null;
  return {
    sample_id: sampleId,
    type: position?.type ?? null,
    point_longitude: point?.longitude ?? null,
    point_latitude: point?.latitude ?? null,
    area_west_longitude: area?.westLongitude ?? null,
    area_east_longitude: area?.eastLongitude ?? null,
    area_south_latitude: area?.southLatitude ?? null,
    area_north_latitude: area?.northLatitude ?? null,
    elevation_min: elevation?.min ?? null,
    elevation_max: elevation?.max ?? null,
    elevation_unit: elevation?.unit ?? null,
    vertical_datum: elevation?.datum ?? null,
    navigation_type: location.navigationType ?? null,
    region_kind: region?.kind ?? null,
    country: region?.kind === "continent" ? region.country : null,
    ocean_sea: region?.kind === "ocean" ? region.oceanSea : null,
    locality_name: location.localityName ?? null,
    locality_description: location.localityDescription ?? null,
  };
}

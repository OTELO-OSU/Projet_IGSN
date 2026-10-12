import type { Selectable } from "kysely";

import {
  type Location,
  locationSchema,
} from "@projet-igsn/domain/sample/location/model";

import type { DB } from "../../db.ts";

type LocationColumn = keyof ReturnType<typeof locationColumns>;

export const VERTICAL_POSITION_COLUMNS = [
  "reference",
  "system",
  "start_value",
  "end_value",
] as const;

type VerticalPositionRow = Pick<
  Selectable<DB["location_vertical_position"]>,
  (typeof VERTICAL_POSITION_COLUMNS)[number]
>;

export type LocationRow = Pick<Selectable<DB["location"]>, LocationColumn> & {
  vertical_positions: VerticalPositionRow[];
};

export function toLocation(row: LocationRow | null): Location | null {
  if (row === null) return null;
  const position = toPosition(row);
  const region = toRegion(row);
  const location = {
    ...(position ? { position } : {}),
    ...(region ? { region } : {}),
    ...(row.navigation_type !== null
      ? { navigationType: row.navigation_type }
      : {}),
    ...(row.locality_name !== null ? { localityName: row.locality_name } : {}),
    ...(row.locality_description !== null
      ? { localityDescription: row.locality_description }
      : {}),
    ...(row.vertical_positions.length > 0
      ? {
          verticalPositions: row.vertical_positions.map(
            ({ reference, system, start_value, end_value }) => ({
              reference,
              system,
              start: start_value,
              end: end_value,
            }),
          ),
        }
      : {}),
  };
  if (Object.keys(location).length === 0) return null;
  return locationSchema.parse(location);
}

function toPosition(row: LocationRow) {
  if (row.location_type === "point") {
    return {
      type: "point",
      longitude: row.point_longitude,
      latitude: row.point_latitude,
    };
  }
  if (row.location_type === "area") {
    return {
      type: "area",
      westLongitude: row.area_west_longitude,
      eastLongitude: row.area_east_longitude,
      southLatitude: row.area_south_latitude,
      northLatitude: row.area_north_latitude,
    };
  }
  if (row.location_type === "line") {
    return {
      type: "line",
      startLongitude: row.line_start_longitude,
      startLatitude: row.line_start_latitude,
      endLongitude: row.line_end_longitude,
      endLatitude: row.line_end_latitude,
    };
  }
  return null;
}

function toRegion(row: LocationRow) {
  if (row.region_kind === "country") {
    return { kind: "country", country: row.country };
  }
  if (row.region_kind === "ocean") {
    return { kind: "ocean", oceanSea: row.ocean_sea };
  }
  return null;
}

export function locationColumns(location: Location | null | undefined) {
  const position = location?.position ?? null;
  const point = position?.type === "point" ? position : null;
  const area = position?.type === "area" ? position : null;
  const line = position?.type === "line" ? position : null;
  const region = location?.region ?? null;
  return {
    location_type: position?.type ?? null,
    point_longitude: point?.longitude ?? null,
    point_latitude: point?.latitude ?? null,
    area_west_longitude: area?.westLongitude ?? null,
    area_east_longitude: area?.eastLongitude ?? null,
    area_south_latitude: area?.southLatitude ?? null,
    area_north_latitude: area?.northLatitude ?? null,
    line_start_longitude: line?.startLongitude ?? null,
    line_start_latitude: line?.startLatitude ?? null,
    line_end_longitude: line?.endLongitude ?? null,
    line_end_latitude: line?.endLatitude ?? null,
    navigation_type: location?.navigationType ?? null,
    region_kind: region?.kind ?? null,
    country: (region?.kind === "country" ? region.country : null) ?? null,
    ocean_sea: (region?.kind === "ocean" ? region.oceanSea : null) ?? null,
    locality_name: location?.localityName ?? null,
    locality_description: location?.localityDescription ?? null,
  };
}

export const LOCATION_COLUMNS = Object.keys(
  locationColumns(null),
) as LocationColumn[];

export function hasLocationData(
  columns: ReturnType<typeof locationColumns>,
): boolean {
  return Object.values(columns).some((value) => value !== null);
}

import type { Selectable } from "kysely";

import {
  type Location,
  locationSchema,
} from "@projet-igsn/domain/sample/location/model";

import type { DB } from "../../db.ts";

type SampleRow = Selectable<DB["sample"]>;

export function toLocation(row: SampleRow): Location | null {
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
  };
  if (Object.keys(location).length === 0) return null;
  return locationSchema.parse(location);
}

function toVertical<T extends object>(row: SampleRow, values: T) {
  if (
    row.vertical_reference === null &&
    row.vertical_reference_system === null &&
    Object.values(values).every((value) => value === null)
  )
    return undefined;
  return {
    ...values,
    reference: row.vertical_reference,
    system: row.vertical_reference_system,
  };
}

function toPosition(row: SampleRow) {
  if (row.location_type === "point") {
    return {
      type: "point",
      longitude: row.point_longitude,
      latitude: row.point_latitude,
      vertical: toVertical(row, { position: row.vertical_position }),
    };
  }
  if (row.location_type === "area") {
    return {
      type: "area",
      westLongitude: row.area_west_longitude,
      eastLongitude: row.area_east_longitude,
      southLatitude: row.area_south_latitude,
      northLatitude: row.area_north_latitude,
      vertical: toVertical(row, {
        min: row.vertical_position_min,
        max: row.vertical_position_max,
      }),
    };
  }
  if (row.location_type === "line") {
    return {
      type: "line",
      startLongitude: row.line_start_longitude,
      startLatitude: row.line_start_latitude,
      endLongitude: row.line_end_longitude,
      endLatitude: row.line_end_latitude,
      vertical: toVertical(row, {
        start: row.line_start_vertical_position,
        end: row.line_end_vertical_position,
      }),
    };
  }
  return null;
}

function toRegion(row: SampleRow) {
  if (row.region_kind === "continent") {
    return { kind: "continent", country: row.country };
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
  const vertical = position?.vertical ?? null;
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
    vertical_position: point?.vertical?.position ?? null,
    vertical_position_min: area?.vertical?.min ?? null,
    vertical_position_max: area?.vertical?.max ?? null,
    line_start_vertical_position: line?.vertical?.start ?? null,
    line_end_vertical_position: line?.vertical?.end ?? null,
    vertical_reference: vertical?.reference ?? null,
    vertical_reference_system: vertical?.system ?? null,
    navigation_type: location?.navigationType ?? null,
    region_kind: region?.kind ?? null,
    country: region?.kind === "continent" ? region.country : null,
    ocean_sea: region?.kind === "ocean" ? region.oceanSea : null,
    locality_name: location?.localityName ?? null,
    locality_description: location?.localityDescription ?? null,
  };
}

import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";

import { m } from "#/paraglide/messages.js";

export type RegionKind = "continent" | "ocean";

const LOCATION_TYPE_LABELS: Record<LocationType, () => string> = {
  point: m.location_type_point,
  area: m.location_type_area,
  line: m.location_type_line,
};

const REGION_KIND_LABELS: Record<RegionKind, () => string> = {
  continent: m.region_kind_continent,
  ocean: m.region_kind_ocean,
};

export function locationTypeLabel(type: LocationType): string {
  return LOCATION_TYPE_LABELS[type]();
}

export function regionKindLabel(kind: RegionKind): string {
  return REGION_KIND_LABELS[kind]();
}

export function countryName(code: Country): string {
  return countryLabel(code, "en");
}

import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import { COUNTRIES } from "@projet-igsn/domain/sample/location/country";
import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { OCEAN_SEAS } from "@projet-igsn/domain/sample/location/ocean-sea";

import { m } from "#/paraglide/messages.js";
import { oceanSeaLabel } from "#/samples/sample-labels.ts";

const LOCATION_TYPE_LABELS: Record<LocationType, () => string> = {
  point: m.location_type_point,
  area: m.location_type_area,
  line: m.location_type_line,
};

const REGION_PATH_LABELS: Record<string, string> = {
  country: m.region_kind_country(),
  ocean: m.region_kind_ocean(),
  ...Object.fromEntries(
    COUNTRIES.map((code) => [`country.${code}`, countryLabel(code, "en")]),
  ),
  ...Object.fromEntries(
    OCEAN_SEAS.map((code) => [`ocean.${code}`, oceanSeaLabel(code)]),
  ),
};

export function locationTypeLabel(type: LocationType): string {
  return LOCATION_TYPE_LABELS[type]();
}

export function regionPathLabel(path: string): string {
  return REGION_PATH_LABELS[path] ?? path;
}

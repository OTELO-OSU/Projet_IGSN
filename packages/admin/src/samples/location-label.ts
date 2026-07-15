import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";

import { m } from "#/paraglide/messages.js";

// Region kind is a UI-only toggle (continent/ocean), not a domain vocabulary.
export type RegionKind = "continent" | "ocean";

// Exhaustive label maps: a new code fails to compile until it is translated.
const LOCATION_TYPE_LABELS: Record<LocationType, () => string> = {
  point: m.location_type_point,
  area: m.location_type_area,
};

const VERTICAL_DATUM_LABELS: Record<VerticalDatum, () => string> = {
  msl: m.vertical_datum_msl,
  wgs84: m.vertical_datum_wgs84,
  grs80: m.vertical_datum_grs80,
};

const REGION_KIND_LABELS: Record<RegionKind, () => string> = {
  continent: m.region_kind_continent,
  ocean: m.region_kind_ocean,
};

export function locationTypeLabel(type: LocationType): string {
  return LOCATION_TYPE_LABELS[type]();
}

export function verticalDatumLabel(datum: VerticalDatum): string {
  return VERTICAL_DATUM_LABELS[datum]();
}

export function regionKindLabel(kind: RegionKind): string {
  return REGION_KIND_LABELS[kind]();
}

// Admin is single-locale; the public frontend localizes in its own phase.
export function countryName(code: Country): string {
  return countryLabel(code, "en");
}

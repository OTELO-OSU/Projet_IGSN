import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { ElevationUnit } from "@projet-igsn/domain/sample/location/elevation-unit";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

// The Location tab's flat form draft: numbers as `number | undefined`
// (NumberField owns the string conversion, so the draft never holds NaN),
// free text as-is (TextField renders nullish as empty), selects as their
// code, "" when unset. `composeLocation` maps it back to a domain Location
// for submit and `toLocationDraft` fills it from a saved sample;
// createSampleSchema validates.
export type LocationDraft = {
  type: "" | "point" | "area";
  longitude: number | undefined;
  latitude: number | undefined;
  westLongitude: number | undefined;
  eastLongitude: number | undefined;
  southLatitude: number | undefined;
  northLatitude: number | undefined;
  elevationValue: number | undefined;
  elevationMin: number | undefined;
  elevationMax: number | undefined;
  elevationUnit: "" | ElevationUnit;
  elevationDatum: "" | VerticalDatum;
  regionKind: "" | "continent" | "ocean";
  country: "" | Country;
  oceanSea: "" | OceanSea;
  navigationType: "" | NavigationType;
  localityName: string | null | undefined;
  localityDescription: string | null | undefined;
};

export const emptyLocationDraft: LocationDraft = {
  type: "",
  longitude: undefined,
  latitude: undefined,
  westLongitude: undefined,
  eastLongitude: undefined,
  southLatitude: undefined,
  northLatitude: undefined,
  elevationValue: undefined,
  elevationMin: undefined,
  elevationMax: undefined,
  elevationUnit: "",
  elevationDatum: "",
  regionKind: "",
  country: "",
  oceanSea: "",
  navigationType: "",
  localityName: undefined,
  localityDescription: undefined,
};

function composePosition(draft: LocationDraft): Location["position"] {
  if (draft.type === "point") {
    const { longitude, latitude, elevationValue: value } = draft;
    if (longitude === undefined || latitude === undefined) return undefined;
    // A point is the degenerate range where min === max (ADR 0014).
    const elevation =
      value !== undefined && draft.elevationUnit && draft.elevationDatum
        ? {
            min: value,
            max: value,
            unit: draft.elevationUnit,
            datum: draft.elevationDatum,
          }
        : undefined;
    return { type: "point", longitude, latitude, elevation };
  }
  if (draft.type === "area") {
    const { westLongitude, eastLongitude, southLatitude, northLatitude } =
      draft;
    if (
      westLongitude === undefined ||
      eastLongitude === undefined ||
      southLatitude === undefined ||
      northLatitude === undefined
    )
      return undefined;
    const { elevationMin: min, elevationMax: max } = draft;
    const elevation =
      min !== undefined &&
      max !== undefined &&
      draft.elevationUnit &&
      draft.elevationDatum
        ? { min, max, unit: draft.elevationUnit, datum: draft.elevationDatum }
        : undefined;
    return {
      type: "area",
      westLongitude,
      eastLongitude,
      southLatitude,
      northLatitude,
      elevation,
    };
  }
  return undefined;
}

function composeRegion(draft: LocationDraft): Location["region"] {
  if (draft.regionKind === "continent" && draft.country)
    return { kind: "continent", country: draft.country };
  if (draft.regionKind === "ocean" && draft.oceanSea)
    return { kind: "ocean", oceanSea: draft.oceanSea };
  return undefined;
}

export function composeLocation(draft: LocationDraft): Location | null {
  const position = composePosition(draft);
  const region = composeRegion(draft);
  // Navigation type is meaningless without a position, so drop it otherwise
  // (the field is only shown once a geometry is chosen, but its value lingers).
  const navigationType = position
    ? draft.navigationType || undefined
    : undefined;
  const localityName = draft.localityName?.trim() || undefined;
  const localityDescription = draft.localityDescription?.trim() || undefined;
  const location = {
    position,
    region,
    navigationType,
    localityName,
    localityDescription,
  };
  // All parts unset means no location at all; undefined values are dropped by
  // JSON on the wire, so the stored shape stays minimal.
  return Object.values(location).some((part) => part !== undefined)
    ? location
    : null;
}

export function toLocationDraft(
  location: Location | null | undefined,
): LocationDraft {
  if (!location) return emptyLocationDraft;
  const { position, region } = location;
  const point = position?.type === "point" ? position : undefined;
  const area = position?.type === "area" ? position : undefined;
  const elevation = position?.elevation;
  return {
    type: position?.type ?? "",
    longitude: point?.longitude,
    latitude: point?.latitude,
    westLongitude: area?.westLongitude,
    eastLongitude: area?.eastLongitude,
    southLatitude: area?.southLatitude,
    northLatitude: area?.northLatitude,
    // A point's single value is the degenerate range's min (=== max).
    elevationValue: point ? elevation?.min : undefined,
    elevationMin: area ? elevation?.min : undefined,
    elevationMax: area ? elevation?.max : undefined,
    elevationUnit: elevation?.unit ?? "",
    elevationDatum: elevation?.datum ?? "",
    regionKind: region?.kind ?? "",
    country: region?.kind === "continent" ? region.country : "",
    oceanSea: region?.kind === "ocean" ? region.oceanSea : "",
    navigationType: location.navigationType ?? "",
    localityName: location.localityName,
    localityDescription: location.localityDescription,
  };
}

import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { ElevationUnit } from "@projet-igsn/domain/sample/location/elevation-unit";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

// The Location tab's flat form draft: every field holds its typed value or
// nullish when unset (the bound fields render nullish as empty, so the draft
// never holds NaN or an "" sentinel). `composeLocation` composes it into a
// location candidate for submit (locationSchema, via sampleDraftSchema,
// judges completeness) and `toLocationDraft` fills it from a saved sample.
export type LocationDraft = {
  type: "point" | "area" | null | undefined;
  longitude: number | undefined;
  latitude: number | undefined;
  westLongitude: number | undefined;
  eastLongitude: number | undefined;
  southLatitude: number | undefined;
  northLatitude: number | undefined;
  elevationValue: number | undefined;
  elevationMin: number | undefined;
  elevationMax: number | undefined;
  elevationUnit: ElevationUnit | null | undefined;
  elevationDatum: VerticalDatum | null | undefined;
  regionKind: "continent" | "ocean" | null | undefined;
  country: Country | null | undefined;
  oceanSea: OceanSea | null | undefined;
  navigationType: NavigationType | null | undefined;
  localityName: string | null | undefined;
  localityDescription: string | null | undefined;
};

// A location as composed from the draft, before locationSchema judges it: the
// Location shape with possibly missing leaf values. Compose does not decide
// completeness; the schema (via sampleDraftSchema) rejects partial data on the
// offending field. Compose only excludes values hidden behind the UI state,
// since a schema error on a hidden or disabled field could never be fixed.
type ElevationCandidate = {
  min: number | undefined;
  max: number | undefined;
  unit: ElevationUnit | undefined;
  datum: VerticalDatum | undefined;
};

type LocationCandidate = {
  position:
    | {
        type: "point";
        longitude: number | undefined;
        latitude: number | undefined;
        elevation: ElevationCandidate | undefined;
      }
    | {
        type: "area";
        westLongitude: number | undefined;
        eastLongitude: number | undefined;
        southLatitude: number | undefined;
        northLatitude: number | undefined;
        elevation: ElevationCandidate | undefined;
      }
    | undefined;
  region:
    | { kind: "continent"; country: Country | undefined }
    | { kind: "ocean"; oceanSea: OceanSea | undefined }
    | undefined;
  navigationType: NavigationType | undefined;
  localityName: string | undefined;
  localityDescription: string | undefined;
};

// Elevation flows through once a value is entered. A unit or datum left behind
// by an emptied value is excluded: those fields are disabled without a value,
// so a lingering selection is a UI leftover, not entered data.
function composeElevation(
  min: number | undefined,
  max: number | undefined,
  draft: LocationDraft,
): ElevationCandidate | undefined {
  if (min === undefined && max === undefined) return undefined;
  return {
    min,
    max,
    unit: draft.elevationUnit || undefined,
    datum: draft.elevationDatum || undefined,
  };
}

function composePosition(draft: LocationDraft): LocationCandidate["position"] {
  if (draft.type === "point") {
    return {
      type: "point",
      longitude: draft.longitude,
      latitude: draft.latitude,
      // A point is the degenerate range where min === max (ADR 0014).
      elevation: composeElevation(
        draft.elevationValue,
        draft.elevationValue,
        draft,
      ),
    };
  }
  if (draft.type === "area") {
    return {
      type: "area",
      westLongitude: draft.westLongitude,
      eastLongitude: draft.eastLongitude,
      southLatitude: draft.southLatitude,
      northLatitude: draft.northLatitude,
      elevation: composeElevation(
        draft.elevationMin,
        draft.elevationMax,
        draft,
      ),
    };
  }
  return undefined;
}

function composeRegion(draft: LocationDraft): LocationCandidate["region"] {
  if (draft.regionKind === "continent")
    return { kind: "continent", country: draft.country || undefined };
  if (draft.regionKind === "ocean")
    return { kind: "ocean", oceanSea: draft.oceanSea || undefined };
  return undefined;
}

export function composeLocation(
  draft: LocationDraft,
): LocationCandidate | null {
  const position = composePosition(draft);
  const region = composeRegion(draft);
  // The navigation type field is only shown once a geometry is chosen, so a
  // lingering value without one is a hidden leftover, not data.
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
  const position = location?.position;
  const region = location?.region;
  const point = position?.type === "point" ? position : undefined;
  const area = position?.type === "area" ? position : undefined;
  const elevation = position?.elevation;
  return {
    type: position?.type,
    longitude: point?.longitude,
    latitude: point?.latitude,
    westLongitude: area?.westLongitude,
    eastLongitude: area?.eastLongitude,
    southLatitude: area?.southLatitude,
    northLatitude: area?.northLatitude,
    // A point's single value is the degenerate range's min (=== max). The
    // schema types the bounds as nullish; the draft holds `undefined` for unset.
    elevationValue: point ? (elevation?.min ?? undefined) : undefined,
    elevationMin: area ? (elevation?.min ?? undefined) : undefined,
    elevationMax: area ? (elevation?.max ?? undefined) : undefined,
    elevationUnit: elevation?.unit,
    elevationDatum: elevation?.datum,
    regionKind: region?.kind,
    country: region?.kind === "continent" ? region.country : undefined,
    oceanSea: region?.kind === "ocean" ? region.oceanSea : undefined,
    navigationType: location?.navigationType,
    localityName: location?.localityName,
    localityDescription: location?.localityDescription,
  };
}

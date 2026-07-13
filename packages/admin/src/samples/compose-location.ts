import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { ElevationUnit } from "@projet-igsn/domain/sample/location/elevation-unit";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

// The Location tab keeps everything as strings in the form store (numbers as
// their input text, selects as their code, "" when unset), so the draft never
// holds NaN. `composeLocation` maps it back to a domain Location for submit and
// `toLocationDraft` fills it from a saved sample; createSampleSchema validates.
export type LocationDraft = {
  type: "" | "point" | "area";
  longitude: string;
  latitude: string;
  westLongitude: string;
  eastLongitude: string;
  southLatitude: string;
  northLatitude: string;
  elevationValue: string;
  elevationMin: string;
  elevationMax: string;
  elevationUnit: "" | ElevationUnit;
  elevationDatum: "" | VerticalDatum;
  regionKind: "" | "continent" | "ocean";
  country: "" | Country;
  oceanSea: "" | OceanSea;
  navigationType: "" | NavigationType;
  localityName: string;
  localityDescription: string;
};

export const emptyLocationDraft: LocationDraft = {
  type: "",
  longitude: "",
  latitude: "",
  westLongitude: "",
  eastLongitude: "",
  southLatitude: "",
  northLatitude: "",
  elevationValue: "",
  elevationMin: "",
  elevationMax: "",
  elevationUnit: "",
  elevationDatum: "",
  regionKind: "",
  country: "",
  oceanSea: "",
  navigationType: "",
  localityName: "",
  localityDescription: "",
};

// An empty string means "not entered"; a non-numeric string drops the field so
// an incomplete coordinate saves as a draft rather than silently failing parse.
function num(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isNaN(value) ? undefined : value;
}

function composePosition(draft: LocationDraft): Location["position"] {
  if (draft.type === "point") {
    const longitude = num(draft.longitude);
    const latitude = num(draft.latitude);
    if (longitude === undefined || latitude === undefined) return undefined;
    const value = num(draft.elevationValue);
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
    const westLongitude = num(draft.westLongitude);
    const eastLongitude = num(draft.eastLongitude);
    const southLatitude = num(draft.southLatitude);
    const northLatitude = num(draft.northLatitude);
    if (
      westLongitude === undefined ||
      eastLongitude === undefined ||
      southLatitude === undefined ||
      northLatitude === undefined
    )
      return undefined;
    const min = num(draft.elevationMin);
    const max = num(draft.elevationMax);
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
  const navigationType = draft.navigationType || undefined;
  const localityName = draft.localityName.trim() || undefined;
  const localityDescription = draft.localityDescription.trim() || undefined;
  if (
    !position &&
    !region &&
    !navigationType &&
    !localityName &&
    !localityDescription
  )
    return null;
  return {
    ...(position ? { position } : {}),
    ...(region ? { region } : {}),
    ...(navigationType ? { navigationType } : {}),
    ...(localityName ? { localityName } : {}),
    ...(localityDescription ? { localityDescription } : {}),
  };
}

const text = (value: number | undefined): string =>
  value === undefined ? "" : String(value);

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
    longitude: text(point?.longitude),
    latitude: text(point?.latitude),
    westLongitude: text(area?.westLongitude),
    eastLongitude: text(area?.eastLongitude),
    southLatitude: text(area?.southLatitude),
    northLatitude: text(area?.northLatitude),
    // A point's single value is the degenerate range's min (=== max).
    elevationValue: text(point ? elevation?.min : undefined),
    elevationMin: text(area ? elevation?.min : undefined),
    elevationMax: text(area ? elevation?.max : undefined),
    elevationUnit: elevation?.unit ?? "",
    elevationDatum: elevation?.datum ?? "",
    regionKind: region?.kind ?? "",
    country: region?.kind === "continent" ? region.country : "",
    oceanSea: region?.kind === "ocean" ? region.oceanSea : "",
    navigationType: location.navigationType ?? "",
    localityName: location.localityName ?? "",
    localityDescription: location.localityDescription ?? "",
  };
}

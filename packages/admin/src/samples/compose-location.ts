import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { ElevationUnit } from "@projet-igsn/domain/sample/location/elevation-unit";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalDatum } from "@projet-igsn/domain/sample/location/vertical-datum";

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

export const isElevationEntered = (location: LocationDraft): boolean => {
  const hasMeta =
    location.elevationUnit != null || location.elevationDatum != null;
  return location.type === "point"
    ? location.elevationValue !== undefined || hasMeta
    : location.type === "area"
      ? location.elevationMin !== undefined ||
        location.elevationMax !== undefined ||
        hasMeta
      : false;
};

function composeElevation(
  min: number | undefined,
  max: number | undefined,
  draft: LocationDraft,
): ElevationCandidate | undefined {
  if (!isElevationEntered(draft)) return undefined;
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

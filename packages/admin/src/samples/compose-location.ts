import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalReference } from "@projet-igsn/domain/sample/location/vertical-reference";
import type { VerticalReferenceSystem } from "@projet-igsn/domain/sample/location/vertical-reference-system";

export type LocationDraft = {
  type: LocationType | null | undefined;
  longitude: number | undefined;
  latitude: number | undefined;
  westLongitude: number | undefined;
  eastLongitude: number | undefined;
  southLatitude: number | undefined;
  northLatitude: number | undefined;
  startLongitude: number | undefined;
  startLatitude: number | undefined;
  endLongitude: number | undefined;
  endLatitude: number | undefined;
  verticalPosition: number | undefined;
  verticalPositionMin: number | undefined;
  verticalPositionMax: number | undefined;
  startVerticalPosition: number | undefined;
  endVerticalPosition: number | undefined;
  verticalReference: VerticalReference | null | undefined;
  verticalReferenceSystem: VerticalReferenceSystem | null | undefined;
  regionKind: "continent" | "ocean" | null | undefined;
  country: Country | null | undefined;
  oceanSea: OceanSea | null | undefined;
  navigationType: NavigationType | null | undefined;
  localityName: string | null | undefined;
  localityDescription: string | null | undefined;
};

type VerticalMeta = {
  reference: VerticalReference | undefined;
  system: VerticalReferenceSystem | undefined;
};

type LocationCandidate = {
  position:
    | {
        type: "point";
        longitude: number | undefined;
        latitude: number | undefined;
        vertical: ({ position: number | undefined } & VerticalMeta) | undefined;
      }
    | {
        type: "area";
        westLongitude: number | undefined;
        eastLongitude: number | undefined;
        southLatitude: number | undefined;
        northLatitude: number | undefined;
        vertical:
          | ({
              min: number | undefined;
              max: number | undefined;
            } & VerticalMeta)
          | undefined;
      }
    | {
        type: "line";
        startLongitude: number | undefined;
        startLatitude: number | undefined;
        endLongitude: number | undefined;
        endLatitude: number | undefined;
        vertical:
          | ({
              start: number | undefined;
              end: number | undefined;
            } & VerticalMeta)
          | undefined;
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

const verticalValues = (location: LocationDraft): (number | undefined)[] => {
  switch (location.type) {
    case "point":
      return [location.verticalPosition];
    case "area":
      return [location.verticalPositionMin, location.verticalPositionMax];
    case "line":
      return [location.startVerticalPosition, location.endVerticalPosition];
    default:
      return [];
  }
};

export const isVerticalEntered = (location: LocationDraft): boolean =>
  verticalValues(location).some((value) => value !== undefined) ||
  location.verticalReference != null ||
  location.verticalReferenceSystem != null;

function composeVertical<T extends object>(
  draft: LocationDraft,
  values: T,
): (T & VerticalMeta) | undefined {
  if (!isVerticalEntered(draft)) return undefined;
  return {
    ...values,
    reference: draft.verticalReference || undefined,
    system: draft.verticalReferenceSystem || undefined,
  };
}

function composePosition(draft: LocationDraft): LocationCandidate["position"] {
  if (draft.type === "point") {
    return {
      type: "point",
      longitude: draft.longitude,
      latitude: draft.latitude,
      vertical: composeVertical(draft, { position: draft.verticalPosition }),
    };
  }
  if (draft.type === "area") {
    return {
      type: "area",
      westLongitude: draft.westLongitude,
      eastLongitude: draft.eastLongitude,
      southLatitude: draft.southLatitude,
      northLatitude: draft.northLatitude,
      vertical: composeVertical(draft, {
        min: draft.verticalPositionMin,
        max: draft.verticalPositionMax,
      }),
    };
  }
  if (draft.type === "line") {
    return {
      type: "line",
      startLongitude: draft.startLongitude,
      startLatitude: draft.startLatitude,
      endLongitude: draft.endLongitude,
      endLatitude: draft.endLatitude,
      vertical: composeVertical(draft, {
        start: draft.startVerticalPosition,
        end: draft.endVerticalPosition,
      }),
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
  const line = position?.type === "line" ? position : undefined;
  return {
    type: position?.type,
    longitude: point?.longitude,
    latitude: point?.latitude,
    westLongitude: area?.westLongitude,
    eastLongitude: area?.eastLongitude,
    southLatitude: area?.southLatitude,
    northLatitude: area?.northLatitude,
    startLongitude: line?.startLongitude,
    startLatitude: line?.startLatitude,
    endLongitude: line?.endLongitude,
    endLatitude: line?.endLatitude,
    verticalPosition: point?.vertical?.position ?? undefined,
    verticalPositionMin: area?.vertical?.min ?? undefined,
    verticalPositionMax: area?.vertical?.max ?? undefined,
    startVerticalPosition: line?.vertical?.start ?? undefined,
    endVerticalPosition: line?.vertical?.end ?? undefined,
    verticalReference: position?.vertical?.reference,
    verticalReferenceSystem: position?.vertical?.system,
    regionKind: region?.kind,
    country: region?.kind === "continent" ? region.country : undefined,
    oceanSea: region?.kind === "ocean" ? region.oceanSea : undefined,
    navigationType: location?.navigationType,
    localityName: location?.localityName,
    localityDescription: location?.localityDescription,
  };
}

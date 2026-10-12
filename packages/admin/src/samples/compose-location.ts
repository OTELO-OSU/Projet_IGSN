import type { Country } from "@projet-igsn/domain/sample/location/country";
import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { NavigationType } from "@projet-igsn/domain/sample/location/navigation-type";
import type { OceanSea } from "@projet-igsn/domain/sample/location/ocean-sea";
import type { VerticalReference } from "@projet-igsn/domain/sample/location/vertical-reference";
import type { VerticalReferenceSystem } from "@projet-igsn/domain/sample/location/vertical-reference-system";

import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/lib/hierarchy";
import { countrySchema } from "@projet-igsn/domain/sample/location/country";
import { oceanSeaSchema } from "@projet-igsn/domain/sample/location/ocean-sea";

export type VerticalPositionDraft = {
  key: string;
  reference: VerticalReference | null | undefined;
  system: VerticalReferenceSystem | null | undefined;
  start: number | undefined;
  end: number | undefined;
};

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
  verticalPositions: VerticalPositionDraft[];
  regionPath: string[];
  navigationType: NavigationType | null | undefined;
  localityName: string | null | undefined;
  localityDescription: string | null | undefined;
};

type LocationCandidate = {
  position:
    | {
        type: "point";
        longitude: number | undefined;
        latitude: number | undefined;
      }
    | {
        type: "area";
        westLongitude: number | undefined;
        eastLongitude: number | undefined;
        southLatitude: number | undefined;
        northLatitude: number | undefined;
      }
    | {
        type: "line";
        startLongitude: number | undefined;
        startLatitude: number | undefined;
        endLongitude: number | undefined;
        endLatitude: number | undefined;
      }
    | undefined;
  region:
    | { kind: "country"; country: Country | undefined }
    | { kind: "ocean"; oceanSea: OceanSea | undefined }
    | undefined;
  navigationType: NavigationType | undefined;
  localityName: string | undefined;
  localityDescription: string | undefined;
  verticalPositions:
    | {
        reference: VerticalReference | undefined;
        system: VerticalReferenceSystem | undefined;
        start: number | undefined;
        end: number | undefined;
      }[]
    | undefined;
};

function composePosition(draft: LocationDraft): LocationCandidate["position"] {
  if (draft.type === "point") {
    return {
      type: "point",
      longitude: draft.longitude,
      latitude: draft.latitude,
    };
  }
  if (draft.type === "area") {
    return {
      type: "area",
      westLongitude: draft.westLongitude,
      eastLongitude: draft.eastLongitude,
      southLatitude: draft.southLatitude,
      northLatitude: draft.northLatitude,
    };
  }
  if (draft.type === "line") {
    return {
      type: "line",
      startLongitude: draft.startLongitude,
      startLatitude: draft.startLatitude,
      endLongitude: draft.endLongitude,
      endLatitude: draft.endLatitude,
    };
  }
  return undefined;
}

function composeRegion(draft: LocationDraft): LocationCandidate["region"] {
  const [kind, leaf] =
    composeHierarchyValue(draft.regionPath)?.split(".") ?? [];
  if (kind === "country")
    return { kind: "country", country: countrySchema.safeParse(leaf).data };
  if (kind === "ocean")
    return { kind: "ocean", oceanSea: oceanSeaSchema.safeParse(leaf).data };
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
  const verticalPositions =
    position && draft.verticalPositions.length > 0
      ? draft.verticalPositions.map(({ reference, system, start, end }) => ({
          reference: reference || undefined,
          system: system || undefined,
          start,
          end,
        }))
      : undefined;
  const location = {
    position,
    region,
    navigationType,
    localityName,
    localityDescription,
    verticalPositions,
  };
  return Object.values(location).some((part) => part !== undefined)
    ? location
    : null;
}

function regionValue(region: Location["region"]): string | null {
  if (!region) return null;
  const leaf = region.kind === "country" ? region.country : region.oceanSea;
  return leaf ? `${region.kind}.${leaf}` : region.kind;
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
    verticalPositions: (location?.verticalPositions ?? []).map((entry) => ({
      key: crypto.randomUUID(),
      reference: entry.reference,
      system: entry.system,
      start: entry.start ?? undefined,
      end: entry.end ?? undefined,
    })),
    regionPath: toHierarchyPath(regionValue(region)),
    navigationType: location?.navigationType,
    localityName: location?.localityName,
    localityDescription: location?.localityDescription,
  };
}

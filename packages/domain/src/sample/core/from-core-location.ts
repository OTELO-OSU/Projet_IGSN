import type { Location, VerticalPosition } from "../location/model.ts";
import type { CoreLocation } from "./core-production-schema.ts";

import { orNull } from "./core-optional.ts";
import { coreVerticalReference } from "./core-production-schema.ts";
import { fromVerticalDatum } from "./vertical-datum.ts";

type Position = NonNullable<Location["position"]>;

type CoreVerticalExtent = NonNullable<CoreLocation["verticalExtent"]>[number];

function fromVerticalExtent(
  { minimum, maximum }: CoreVerticalExtent,
  isPoint: boolean,
): VerticalPosition {
  const coordinate = minimum ?? maximum;
  return {
    reference: orNull(coordinate?.reference, coreVerticalReference.fromCore),
    system: orNull(coordinate?.verticalDatum, fromVerticalDatum),
    start: minimum?.value ?? null,
    end: (isPoint && maximum == null ? minimum : maximum)?.value ?? null,
  };
}

function fromCoreGeometry(location: CoreLocation): Position | null {
  const geometry = location.geometry;
  if (geometry == null) return null;
  if (geometry.type === "Point") {
    return {
      type: "point",
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
    };
  }
  if (geometry.type === "LineString") {
    const [start, end] = geometry.coordinates;
    if (start == null || end == null) return null;
    return {
      type: "line",
      startLongitude: start[0],
      startLatitude: start[1],
      endLongitude: end[0],
      endLatitude: end[1],
    };
  }
  const ring = geometry.coordinates[0];
  const southWest = ring?.[0];
  const northEast = ring?.[2];
  if (southWest == null || northEast == null) return null;
  return {
    type: "area",
    westLongitude: southWest[0],
    southLatitude: southWest[1],
    eastLongitude: northEast[0],
    northLatitude: northEast[1],
  };
}

export function fromCoreLocation(
  location: CoreLocation | undefined,
): Location | null {
  if (location == null) return null;
  const country = location.countryCodes?.[0];
  return {
    position: fromCoreGeometry(location),
    region:
      country != null
        ? { kind: "country", country }
        : location.oceanOrSea != null
          ? { kind: "ocean", oceanSea: location.oceanOrSea.id }
          : null,
    navigationType: location.navigationMethod?.id ?? null,
    localityName: location.placeNames?.[0] ?? null,
    localityDescription: location.locationDescription ?? null,
    verticalPositions: (location.verticalExtent ?? []).map((extent) =>
      fromVerticalExtent(extent, location.geometry?.type === "Point"),
    ),
  };
}

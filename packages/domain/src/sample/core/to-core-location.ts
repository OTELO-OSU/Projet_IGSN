import type { Location, VerticalPosition } from "../location/model.ts";
import type { CoreLocation } from "./core-production-schema.ts";

import { toConcept } from "./concept.ts";
import { optionalConcept } from "./core-optional.ts";
import { CRS84, coreVerticalReference } from "./core-production-schema.ts";
import { toVerticalDatum } from "./vertical-datum.ts";

type Position = NonNullable<Location["position"]>;

const POSITIVE_DIRECTION: Record<string, "up" | "down"> = {
  elevation: "up",
  depth_below_ground: "down",
  depth_below_sea_floor: "down",
  bathymetry: "down",
  core_depth: "down",
};

function toCoreGeometry(position: Position): CoreLocation["geometry"] {
  switch (position.type) {
    case "point":
      return {
        type: "Point",
        coordinates: [position.longitude, position.latitude],
      };
    case "area":
      return {
        type: "Polygon",
        coordinates: [
          [
            [position.westLongitude, position.southLatitude],
            [position.eastLongitude, position.southLatitude],
            [position.eastLongitude, position.northLatitude],
            [position.westLongitude, position.northLatitude],
            [position.westLongitude, position.southLatitude],
          ],
        ],
      };
    case "line":
      return {
        type: "LineString",
        coordinates: [
          [position.startLongitude, position.startLatitude],
          [position.endLongitude, position.endLatitude],
        ],
      };
  }
}

type CoreVerticalExtent = NonNullable<CoreLocation["verticalExtent"]>[number];

function toVerticalExtent(
  { reference, system, start, end }: VerticalPosition,
  isPoint: boolean,
): CoreVerticalExtent | undefined {
  if (reference == null || (start == null && end == null)) return undefined;
  const coordinate = (value: number | null | undefined) =>
    value == null
      ? undefined
      : {
          value,
          unitCode: "m" as const,
          reference: coreVerticalReference.toCore(reference),
          verticalDatum: system == null ? undefined : toVerticalDatum(system),
          positiveDirection: POSITIVE_DIRECTION[reference],
        };
  return {
    minimum: coordinate(start),
    maximum: isPoint && start === end ? undefined : coordinate(end),
  };
}

function toVerticalExtents(location: Location): CoreLocation["verticalExtent"] {
  const isPoint = location.position?.type === "point";
  const extents = (location.verticalPositions ?? []).flatMap(
    (entry) => toVerticalExtent(entry, isPoint) ?? [],
  );
  return extents.length === 0 ? undefined : extents;
}

export function toCoreLocation(location: Location): CoreLocation {
  const position = location.position;
  const region = location.region;
  return {
    geometry: position == null ? undefined : toCoreGeometry(position),
    crs: position == null ? undefined : CRS84,
    verticalExtent: toVerticalExtents(location),
    placeNames:
      location.localityName == null ? undefined : [location.localityName],
    countryCodes:
      region?.kind === "country" && region.country != null
        ? [region.country]
        : undefined,
    oceanOrSea:
      region?.kind === "ocean" && region.oceanSea != null
        ? toConcept("ocean-sea", region.oceanSea)
        : undefined,
    navigationMethod: optionalConcept(
      "navigation-type",
      location.navigationType,
    ),
    locationDescription: location.localityDescription ?? undefined,
  };
}

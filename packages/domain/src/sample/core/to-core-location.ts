import type { Location } from "../location/model.ts";
import type { CoreLocation } from "./core-production-schema.ts";

import { verticalValues } from "../location/vertical-values.ts";
import { toConcept } from "./concept.ts";
import { optionalConcept } from "./core-optional.ts";
import { CRS84, coreVerticalReference } from "./core-production-schema.ts";
import { toVerticalDatum } from "./vertical-datum.ts";

type Position = NonNullable<Location["position"]>;
type Vertical = NonNullable<Position["vertical"]>;

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

function toVerticalExtent(position: Position): CoreLocation["verticalExtent"] {
  const vertical: Vertical | null | undefined = position.vertical;
  const reference = vertical?.reference;
  if (vertical == null || reference == null) return undefined;
  const coordinate = (value: number | null | undefined) =>
    value == null
      ? undefined
      : {
          value,
          unitCode: "m" as const,
          reference: coreVerticalReference.toCore(reference),
          verticalDatum:
            vertical.system == null
              ? undefined
              : toVerticalDatum(vertical.system),
          positiveDirection: POSITIVE_DIRECTION[reference],
        };
  const [minimum, maximum] = verticalValues(position);
  if (minimum == null && maximum == null) return undefined;
  return { minimum: coordinate(minimum), maximum: coordinate(maximum) };
}

export function toCoreLocation(location: Location): CoreLocation {
  const position = location.position;
  const region = location.region;
  return {
    geometry: position == null ? undefined : toCoreGeometry(position),
    crs: position == null ? undefined : CRS84,
    verticalExtent: position == null ? undefined : toVerticalExtent(position),
    placeNames:
      location.localityName == null ? undefined : [location.localityName],
    countryCodes:
      region?.kind === "continent" && region.country != null
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

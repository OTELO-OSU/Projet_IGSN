import type { Location } from "../location/model.ts";
import type { VerticalReferenceSystem } from "../location/vertical-reference-system.ts";
import type { VerticalReference } from "../location/vertical-reference.ts";
import type { CoreLocation } from "./core-production-schema.ts";

import { orNull } from "./core-optional.ts";
import { coreVerticalReference } from "./core-production-schema.ts";
import { fromVerticalDatum } from "./vertical-datum.ts";

type Position = NonNullable<Location["position"]>;

type Vertical = {
  values: [number | null, number | null];
  reference: VerticalReference;
  system: VerticalReferenceSystem | null;
};

function fromVerticalExtent(
  extent: CoreLocation["verticalExtent"],
): Vertical | null {
  const coordinate = extent?.minimum ?? extent?.maximum;
  if (extent == null || coordinate == null) return null;
  return {
    values: [extent.minimum?.value ?? null, extent.maximum?.value ?? null],
    reference: coreVerticalReference.fromCore(coordinate.reference),
    system: orNull(coordinate.verticalDatum, fromVerticalDatum),
  };
}

function fromCoreGeometry(location: CoreLocation): Position | null {
  const geometry = location.geometry;
  if (geometry == null) return null;
  const vertical = fromVerticalExtent(location.verticalExtent);
  const meta = { reference: vertical?.reference, system: vertical?.system };
  if (geometry.type === "Point") {
    return {
      type: "point",
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
      vertical:
        vertical == null ? null : { position: vertical.values[0], ...meta },
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
      vertical:
        vertical == null
          ? null
          : {
              start: vertical.values[0],
              end: vertical.values[1],
              ...meta,
            },
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
    vertical:
      vertical == null
        ? null
        : { min: vertical.values[0], max: vertical.values[1], ...meta },
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
        ? { kind: "continent", country }
        : location.oceanOrSea != null
          ? { kind: "ocean", oceanSea: location.oceanOrSea.id }
          : null,
    navigationType: location.navigationMethod?.id ?? null,
    localityName: location.placeNames?.[0] ?? null,
    localityDescription: location.locationDescription ?? null,
  };
}

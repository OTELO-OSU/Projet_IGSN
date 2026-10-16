import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapDetail } from "@projet-igsn/domain/sample/map/model";

import L from "leaflet";

import type { MapCluster } from "#/domain/samples/map-cluster-index.ts";

import { clamp } from "#/clamp.ts";
import { extentBounds } from "#/domain/samples/map-view-bounds.ts";

type Position = NonNullable<Location["position"]>;
export type HoveredSample = { igsn: string; position: Position };
export type ShownCluster = MapCluster & { sample?: SampleMapDetail };

// ponytail: a dateline-crossing area is not clipped, and a line takes its midpoint unclipped.
export function highlightPoint(
  position: Position,
  bounds: L.LatLngBounds,
): L.LatLngTuple {
  if (position.type === "point") return [position.latitude, position.longitude];
  if (position.type === "line") {
    return [
      (position.startLatitude + position.endLatitude) / 2,
      (position.startLongitude + position.endLongitude) / 2,
    ];
  }
  const south = clamp(
    position.southLatitude,
    bounds.getSouth(),
    bounds.getNorth(),
  );
  const north = clamp(
    position.northLatitude,
    bounds.getSouth(),
    bounds.getNorth(),
  );
  if (position.westLongitude > position.eastLongitude) {
    return [(south + north) / 2, position.westLongitude];
  }
  const west = clamp(
    position.westLongitude,
    bounds.getWest(),
    bounds.getEast(),
  );
  const east = clamp(
    position.eastLongitude,
    bounds.getWest(),
    bounds.getEast(),
  );
  return [(south + north) / 2, (west + east) / 2];
}

export function highlightedClusterIndex(
  clusters: ShownCluster[],
  highlighted: HoveredSample,
  bounds: L.LatLngBounds,
): number {
  if (clusters.some((cluster) => cluster.sample?.igsn === highlighted.igsn)) {
    return -1;
  }
  const point = L.latLng(highlightPoint(highlighted.position, bounds));
  return clusters.findIndex(
    ({ count, extent }) =>
      count > 1 && extentBounds(extent).pad(0.01).contains(point),
  );
}

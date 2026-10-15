import type { SampleMapPointsResponse } from "@projet-igsn/domain/sample/map/model";
import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import Supercluster from "supercluster";

export type MapPoints = SampleMapPointsResponse["data"];

export type MapCluster = {
  longitude: number;
  latitude: number;
  count: number;
  extent: Bbox;
  number?: number;
};

type PointProperties = { number: number; longitude: number; latitude: number };

export type MapClusterIndex = Supercluster<PointProperties, Bbox>;

const CLUSTER_RADIUS_PX = 40;
const LEAFLET_TILE_PX = 256;

const pointExtent = ({ longitude, latitude }: PointProperties): Bbox => ({
  west: longitude,
  south: latitude,
  east: longitude,
  north: latitude,
});

type PointArrays = {
  [Key in keyof MapPoints]: ArrayLike<number>;
};

export function buildClusterIndex(
  { numbers, longitudes, latitudes }: PointArrays,
  maxZoom: number,
): MapClusterIndex {
  return new Supercluster<PointProperties, Bbox>({
    radius: CLUSTER_RADIUS_PX,
    extent: LEAFLET_TILE_PX,
    maxZoom,
    map: pointExtent,
    reduce: (extent, other) => {
      extent.west = Math.min(extent.west, other.west);
      extent.south = Math.min(extent.south, other.south);
      extent.east = Math.max(extent.east, other.east);
      extent.north = Math.max(extent.north, other.north);
    },
  }).load(
    Array.from(numbers, (number, index) => {
      const longitude = longitudes[index] ?? 0;
      const latitude = latitudes[index] ?? 0;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitude, latitude] },
        properties: { number, longitude, latitude },
      };
    }),
  );
}

export function clustersInView(
  index: MapClusterIndex,
  { west, south, east, north }: Bbox,
  zoom: number,
): MapCluster[] {
  return index
    .getClusters([west, south, east, north], zoom)
    .map(({ properties, geometry: { coordinates } }) => {
      const [longitude = 0, latitude = 0] = coordinates;
      return "cluster_id" in properties
        ? {
            longitude,
            latitude,
            count: properties.point_count,
            extent: {
              west: properties.west,
              south: properties.south,
              east: properties.east,
              north: properties.north,
            },
          }
        : {
            longitude: properties.longitude,
            latitude: properties.latitude,
            count: 1,
            extent: pointExtent(properties),
            number: properties.number,
          };
    });
}

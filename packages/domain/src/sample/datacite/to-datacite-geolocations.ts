import type { CoreLocation } from "../core/core-production-schema.ts";
import type { DataCiteGeoLocation } from "./datacite-schema.ts";

import { isEmpty } from "../core/core-optional.ts";

type CoreGeometry = NonNullable<CoreLocation["geometry"]>;

type CorePosition = Extract<
  CoreGeometry,
  { type: "LineString" }
>["coordinates"][number];

// A collection track never runs the long way round the globe, so a span over 180 degrees crossed the antimeridian.
const boxOfTrack = (positions: CorePosition[]): DataCiteGeoLocation => {
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const crossesAntimeridian = east - west > 180;
  return {
    geoLocationBox: {
      westBoundLongitude: crossesAntimeridian ? east : west,
      eastBoundLongitude: crossesAntimeridian ? west : east,
      southBoundLatitude: Math.min(...latitudes),
      northBoundLatitude: Math.max(...latitudes),
    },
  };
};

const boxOfRing = (ring: CorePosition[]): DataCiteGeoLocation => {
  const [southWest, , northEast] = ring;
  if (southWest == null || northEast == null) return {};
  return {
    geoLocationBox: {
      westBoundLongitude: southWest[0],
      eastBoundLongitude: northEast[0],
      southBoundLatitude: southWest[1],
      northBoundLatitude: northEast[1],
    },
  };
};

const toCoordinates = (
  geometry: CoreGeometry | undefined,
): DataCiteGeoLocation => {
  if (geometry == null) return {};
  if (geometry.type === "Point") {
    const [pointLongitude, pointLatitude] = geometry.coordinates;
    return { geoLocationPoint: { pointLongitude, pointLatitude } };
  }
  if (geometry.type === "LineString") return boxOfTrack(geometry.coordinates);
  return boxOfRing(geometry.coordinates[0] ?? []);
};

export function toDataCiteGeoLocations(
  location: CoreLocation | undefined,
  sensitiveLocation: boolean,
): DataCiteGeoLocation[] {
  if (location == null) return [];
  const geoLocation = {
    geoLocationPlace: location.placeNames?.[0] ?? location.locationDescription,
    ...(sensitiveLocation ? {} : toCoordinates(location.geometry)),
  };
  return isEmpty(geoLocation) ? [] : [geoLocation];
}

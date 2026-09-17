import type { CoreLocation } from "../core/core-production-schema.ts";
import type { DataCiteGeoLocation } from "./datacite-schema.ts";

type CoreGeometry = NonNullable<CoreLocation["geometry"]>;

type CorePosition = Extract<
  CoreGeometry,
  { type: "LineString" }
>["coordinates"][number];

const boxOfTrack = (positions: CorePosition[]): DataCiteGeoLocation => ({
  geoLocationBox: {
    westBoundLongitude: Math.min(...positions.map(([longitude]) => longitude)),
    eastBoundLongitude: Math.max(...positions.map(([longitude]) => longitude)),
    southBoundLatitude: Math.min(...positions.map(([, latitude]) => latitude)),
    northBoundLatitude: Math.max(...positions.map(([, latitude]) => latitude)),
  },
});

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
  return [
    {
      geoLocationPlace:
        location.placeNames?.[0] ?? location.locationDescription,
      ...(sensitiveLocation ? {} : toCoordinates(location.geometry)),
    },
  ];
}

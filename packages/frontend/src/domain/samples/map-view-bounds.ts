import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import L from "leaflet";

import {
  formatBbox,
  singleBoundsOrWorld,
  toBoundsList,
} from "#/domain/samples/search-location-map.tsx";

export type MapViewport = { bbox: string; zoom: number };

export const extentBounds = ({
  west,
  south,
  east,
  north,
}: Bbox): L.LatLngBounds => L.latLngBounds([south, west], [north, east]);

export const boundsOf = (map: L.Map): Bbox => {
  const bounds = map.getBounds();
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
};

export const viewportOf = (map: L.Map): MapViewport => {
  const bounds = map.getBounds();
  return {
    bbox: formatBbox(bounds.getSouthWest(), bounds.getNorthEast()),
    zoom: map.getZoom(),
  };
};

export const openingBounds = (fitTo: Bbox | null): L.LatLngBoundsExpression =>
  singleBoundsOrWorld(fitTo ? toBoundsList(fitTo) : []);

import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { splitBbox } from "@projet-igsn/domain/sample/split-bbox";

import type { MapPoints } from "#/domain/samples/map-cluster-index.ts";

export function pointsExtent({
  longitudes,
  latitudes,
}: MapPoints): Bbox | null {
  if (longitudes.length === 0) return null;
  return {
    west: longitudes.reduce((min, value) => Math.min(min, value)),
    south: latitudes.reduce((min, value) => Math.min(min, value)),
    east: longitudes.reduce((max, value) => Math.max(max, value)),
    north: latitudes.reduce((max, value) => Math.max(max, value)),
  };
}

export function countPointsInView(
  { longitudes, latitudes }: MapPoints,
  bbox: Bbox,
): number {
  const boxes = splitBbox(bbox);
  let count = 0;
  for (const [index, longitude] of longitudes.entries()) {
    const latitude = latitudes[index] ?? Number.NaN;
    const isInView = boxes.some(
      ({ west, south, east, north }) =>
        longitude >= west &&
        longitude <= east &&
        latitude >= south &&
        latitude <= north,
    );
    if (isInView) count += 1;
  }
  return count;
}

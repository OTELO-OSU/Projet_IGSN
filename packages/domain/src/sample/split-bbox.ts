import type { Bbox } from "./sample-validator.ts";

export function splitBbox(bbox: Bbox): Bbox[] {
  const { west, south, east, north } = bbox;
  if (west <= east) return [bbox];
  return [
    { west, south, east: 180, north },
    { west: -180, south, east, north },
  ];
}

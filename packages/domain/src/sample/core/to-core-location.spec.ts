import { describe, expect, it } from "vitest";

import type { Location } from "../location/model.ts";

import { fromCoreLocation } from "./from-core-location.ts";
import { toCoreLocation } from "./to-core-location.ts";

const point = { type: "point", longitude: 6.18, latitude: 48.69 } as const;
const area = {
  type: "area",
  westLongitude: 5,
  eastLongitude: 8,
  southLatitude: 44,
  northLatitude: 46,
} as const;

const coordinate = (
  value: number,
  reference: string,
  positiveDirection: "up" | "down",
) => ({ value, unitCode: "m", reference, positiveDirection });

describe("a location's vertical positions mapped to Core and back", () => {
  it.each<[string, Location, unknown]>([
    [
      "a point's single value, as a minimum alone",
      {
        position: point,
        verticalPositions: [
          { reference: "elevation", system: null, start: 1200, end: 1200 },
        ],
      },
      [{ minimum: coordinate(1200, "elevation", "up") }],
    ],
    [
      "a point interval",
      {
        position: point,
        verticalPositions: [
          { reference: "core_depth", system: null, start: 2, end: 8 },
        ],
      },
      [
        {
          minimum: coordinate(2, "coreDepth", "down"),
          maximum: coordinate(8, "coreDepth", "down"),
        },
      ],
    ],
    [
      "two entries",
      {
        position: area,
        verticalPositions: [
          { reference: "elevation", system: null, start: 0, end: 10 },
          { reference: "bathymetry", system: "msl", start: 100, end: 200 },
        ],
      },
      [
        {
          minimum: coordinate(0, "elevation", "up"),
          maximum: coordinate(10, "elevation", "up"),
        },
        {
          minimum: {
            ...coordinate(100, "bathymetry", "down"),
            verticalDatum: "EPSG:5714",
          },
          maximum: {
            ...coordinate(200, "bathymetry", "down"),
            verticalDatum: "EPSG:5714",
          },
        },
      ],
    ],
  ])("should restore %s", (_label, location, verticalExtent) => {
    const core = toCoreLocation(location);
    expect(core.verticalExtent).toEqual(verticalExtent);
    expect(fromCoreLocation(core)?.verticalPositions).toEqual(
      location.verticalPositions,
    );
  });
});

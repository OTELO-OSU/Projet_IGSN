import { describe, expect, it } from "vitest";

import { locationSchema } from "./model.ts";

describe("locationSchema", () => {
  const point = {
    type: "point" as const,
    longitude: 2.35,
    latitude: 48.85,
  };
  const area = {
    type: "area" as const,
    westLongitude: 5,
    eastLongitude: 8,
    southLatitude: 44,
    northLatitude: 46,
  };
  const line = {
    type: "line" as const,
    startLongitude: 5,
    startLatitude: 44,
    endLongitude: 8,
    endLatitude: 46,
  };

  it("should parse a point position to the same value", () => {
    expect(locationSchema.parse({ position: point })).toEqual({
      position: point,
    });
  });

  it.each<[string, unknown]>([
    ["a bare point", { position: point }],
    [
      "a point with a vertical position",
      {
        position: {
          ...point,
          vertical: {
            position: 1200,
            reference: "depth_below_sea_floor",
            system: "msl",
          },
        },
      },
    ],
    ["an area", { position: area }],
    [
      "an area with a vertical range",
      {
        position: {
          ...area,
          vertical: {
            min: 0,
            max: 100,
            reference: "elevation",
            system: "ngf_ign69",
          },
        },
      },
    ],
    ["a line", { position: line }],
    [
      "a line with vertical endpoints",
      {
        position: {
          ...line,
          vertical: {
            start: 10,
            end: 20,
            reference: "core_depth",
            system: "local",
          },
        },
      },
    ],
    [
      "a descending line, the endpoints having no order",
      {
        position: {
          ...line,
          vertical: {
            start: 900,
            end: 20,
            reference: "bathymetry",
            system: "egm96",
          },
        },
      },
    ],
    [
      "a vertical position of zero",
      { position: { ...point, vertical: { position: 0 } } },
    ],
    [
      "a vertical position missing its reference and system",
      { position: { ...point, vertical: { position: 10 } } },
    ],
    [
      "a half-entered vertical range (min only)",
      { position: { ...area, vertical: { min: 0 } } },
    ],
    [
      "a fractional vertical position",
      { position: { ...point, vertical: { position: 10.5 } } },
    ],
    [
      "a dateline-crossing area",
      {
        position: {
          type: "area",
          westLongitude: 170,
          eastLongitude: -178,
          southLatitude: -5,
          northLatitude: 5,
        },
      },
    ],
    ["a continent region", { region: { kind: "continent", country: "FR" } }],
    [
      "an ocean region",
      { region: { kind: "ocean", oceanSea: "atlantic_ocean" } },
    ],
    ["a continent region without a country", { region: { kind: "continent" } }],
    ["an ocean region without an ocean/sea", { region: { kind: "ocean" } }],
    ["a navigation type", { position: point, navigationType: "GPS" }],
    ["a locality without coordinates", { localityName: "Vent field 7" }],
    ["an empty location", {}],
  ])("should accept %s", (_label, value) => {
    expect(locationSchema.safeParse(value).success).toBe(true);
  });

  it.each<[string, unknown]>([
    ["a point missing latitude", { position: { type: "point", longitude: 2 } }],
    [
      "an area missing an edge",
      {
        position: {
          type: "area",
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 44,
        },
      },
    ],
    [
      "a line missing an endpoint",
      {
        position: {
          type: "line",
          startLongitude: 5,
          startLatitude: 44,
          endLongitude: 8,
        },
      },
    ],
    [
      "an area with north below south",
      {
        position: {
          type: "area",
          westLongitude: 5,
          eastLongitude: 8,
          southLatitude: 46,
          northLatitude: 44,
        },
      },
    ],
    [
      "an area with a vertical min above its max",
      {
        position: {
          ...area,
          vertical: { min: 100, max: 0, reference: "elevation", system: "msl" },
        },
      },
    ],
    [
      "a negative vertical position on a point",
      {
        position: {
          ...point,
          vertical: { position: -50, reference: "bathymetry", system: "msl" },
        },
      },
    ],
    [
      "a negative vertical bound on an area",
      { position: { ...area, vertical: { min: -50, max: 0 } } },
    ],
    [
      "a negative vertical endpoint on a line",
      { position: { ...line, vertical: { start: 0, end: -50 } } },
    ],
    [
      "a longitude out of range",
      { position: { type: "point", longitude: 200, latitude: 0 } },
    ],
    [
      "a latitude out of range",
      { position: { type: "point", longitude: 0, latitude: 100 } },
    ],
    ["a navigation type without a position", { navigationType: "GPS" }],
    ["an unknown position type", { position: { type: "polygon" } }],
  ])("should reject %s", (_label, value) => {
    expect(locationSchema.safeParse(value).success).toBe(false);
  });
});

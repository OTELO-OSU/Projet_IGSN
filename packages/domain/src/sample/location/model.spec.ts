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

  it("should parse a point position to the same value", () => {
    expect(locationSchema.parse({ position: point })).toEqual({
      position: point,
    });
  });

  it.each<[string, unknown]>([
    ["a bare point", { position: point }],
    [
      "a point with a signed elevation (a degenerate range)",
      {
        position: {
          ...point,
          elevation: { min: -1200, max: -1200, unit: "m", datum: "msl" },
        },
      },
    ],
    ["an area", { position: area }],
    [
      "an area with an elevation range",
      {
        position: {
          ...area,
          elevation: { min: 0, max: 100, unit: "km", datum: "wgs84" },
        },
      },
    ],
    // Completeness (unit/datum, both bounds) gates publish, not the draft schema.
    [
      "an elevation missing its unit and datum",
      { position: { ...point, elevation: { min: 10, max: 10 } } },
    ],
    [
      "a half-entered elevation range (min only)",
      { position: { ...area, elevation: { min: 0 } } },
    ],
    // west > east is a valid dateline-crossing area (geography handles it).
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
      "a fractional elevation",
      {
        position: {
          ...point,
          elevation: { min: 10.5, max: 10.5, unit: "m", datum: "msl" },
        },
      },
    ],
    [
      "a continent region with an unknown country",
      { region: { kind: "continent", country: "XX" } },
    ],
    [
      "an ocean region with an unknown code",
      { region: { kind: "ocean", oceanSea: "foo" } },
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
      "an area with elevation min above max",
      {
        position: {
          ...area,
          elevation: { min: 100, max: 0, unit: "m", datum: "msl" },
        },
      },
    ],
    [
      "a longitude out of range",
      { position: { type: "point", longitude: 200, latitude: 0 } },
    ],
    [
      "a latitude out of range",
      { position: { type: "point", longitude: 0, latitude: 100 } },
    ],
    ["an unknown navigation type", { navigationType: "sonar" }],
    ["a navigation type without a position", { navigationType: "GPS" }],
    ["an unknown position type", { position: { type: "line" } }],
  ])("should reject %s", (_label, value) => {
    expect(locationSchema.safeParse(value).success).toBe(false);
  });
});

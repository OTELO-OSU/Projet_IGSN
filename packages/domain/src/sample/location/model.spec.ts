import { describe, expect, it } from "vitest";

import { locationSchema } from "./model.ts";
import { VERTICAL_REFERENCES } from "./vertical-reference.ts";

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

  const entry = (
    start: number | null,
    end: number | null,
    reference: string | null = "elevation",
  ) => ({
    reference,
    system: "msl",
    start,
    end,
  });

  it("should parse a point position to the same value", () => {
    expect(locationSchema.parse({ position: point })).toEqual({
      position: point,
    });
  });

  it.each<[string, unknown]>([
    ["a bare point", { position: point }],
    ["an area", { position: area }],
    ["a line", { position: line }],
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
    ["a country region", { region: { kind: "country", country: "FR" } }],
    [
      "an ocean region",
      { region: { kind: "ocean", oceanSea: "atlantic_ocean" } },
    ],
    [
      "a country region without a country code",
      { region: { kind: "country" } },
    ],
    ["an ocean region without an ocean/sea", { region: { kind: "ocean" } }],
    ["a navigation type", { position: point, navigationType: "GPS" }],
    ["a locality without coordinates", { localityName: "Vent field 7" }],
    ["an empty location", {}],
    [
      "a descending line, its endpoints having no order",
      { position: line, verticalPositions: [entry(900, 20)] },
    ],
    [
      "a point whose single value is both start and end",
      { position: point, verticalPositions: [entry(10.5, 10.5)] },
    ],
    [
      "a vertical value of zero",
      { position: area, verticalPositions: [entry(0, 0)] },
    ],
    [
      "two entries with distinct references",
      {
        position: point,
        verticalPositions: [entry(0, 10), entry(5, 5, "bathymetry")],
      },
    ],
    [
      "entries without a reference or a value",
      {
        position: point,
        verticalPositions: [entry(null, null, null), entry(10, null, null)],
      },
    ],
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

  it.each<[string, unknown, PropertyKey[]]>([
    [
      "a reference used twice",
      {
        position: point,
        verticalPositions: [entry(0, 10), entry(20, 30)],
      },
      ["verticalPositions", 1, "reference"],
    ],
    [
      "an entry without a position",
      { verticalPositions: [entry(0, 10)] },
      ["verticalPositions", 0],
    ],
    [
      "a point interval with its start above its end",
      { position: point, verticalPositions: [entry(100, 0)] },
      ["verticalPositions", 0, "start"],
    ],
    [
      "an area with its start above its end",
      { position: area, verticalPositions: [entry(100, 0)] },
      ["verticalPositions", 0, "start"],
    ],
    [
      "a negative vertical value",
      { position: line, verticalPositions: [entry(0, -50)] },
      ["verticalPositions", 0, "end"],
    ],
  ])("should reject %s on that entry", (_label, value, path) => {
    expect(
      locationSchema.safeParse(value).error?.issues.map((issue) => issue.path),
    ).toEqual([path]);
  });

  it("should reject more entries than references before checking any entry", () => {
    const verticalPositions = Array.from(
      { length: VERTICAL_REFERENCES.length + 1 },
      () => entry(0, 10),
    );

    expect(
      locationSchema
        .safeParse({ position: point, verticalPositions })
        .error?.issues.map((issue) => issue.path),
    ).toEqual([["verticalPositions"]]);
  });
});

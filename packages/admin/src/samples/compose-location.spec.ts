import type { Location } from "@projet-igsn/domain/sample/location/model";

import { describe, expect, it } from "vitest";

import {
  composeLocation,
  type LocationDraft,
  toLocationDraft,
} from "./compose-location.ts";

const draft = (over: Partial<LocationDraft>): LocationDraft => ({
  ...toLocationDraft(null),
  ...over,
});

describe("composeLocation", () => {
  it("should return null for an empty draft", () => {
    expect(composeLocation(draft({}))).toBeNull();
  });

  it("should compose every vertical position one-to-one alongside a position", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 3.5,
          latitude: -45,
          verticalPositions: [
            {
              key: "a",
              reference: "bathymetry",
              system: "msl",
              start: 1200,
              end: 1200,
            },
            {
              key: "b",
              reference: undefined,
              system: undefined,
              start: undefined,
              end: undefined,
            },
          ],
        }),
      ),
    ).toEqual({
      position: { type: "point", longitude: 3.5, latitude: -45 },
      verticalPositions: [
        { reference: "bathymetry", system: "msl", start: 1200, end: 1200 },
        {},
      ],
    });
  });

  it("should drop the vertical positions when there is no position", () => {
    expect(
      composeLocation(
        draft({
          verticalPositions: [
            {
              key: "a",
              reference: "bathymetry",
              system: "msl",
              start: 1200,
              end: 1200,
            },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("should compose an area position", () => {
    expect(
      composeLocation(
        draft({
          type: "area",
          westLongitude: 1,
          eastLongitude: 2,
          southLatitude: 3,
          northLatitude: 4,
        }),
      ),
    ).toEqual({
      position: {
        type: "area",
        westLongitude: 1,
        eastLongitude: 2,
        southLatitude: 3,
        northLatitude: 4,
      },
    });
  });

  it("should keep an incomplete point position for the schema to reject", () => {
    expect(
      composeLocation(
        draft({ type: "point", longitude: 3, localityName: "Vent field" }),
      ),
    ).toEqual({
      position: { type: "point", longitude: 3 },
      localityName: "Vent field",
    });
  });

  it("should keep an incomplete region for the schema to reject", () => {
    expect(composeLocation(draft({ regionPath: ["country"] }))).toEqual({
      region: { kind: "country" },
    });
  });

  it("should compose a country region and drop a blank locality", () => {
    expect(
      composeLocation(
        draft({
          regionPath: ["country", "country.FR"],
          localityName: "  ",
        }),
      ),
    ).toEqual({ region: { kind: "country", country: "FR" } });
  });

  it("should compose an ocean region", () => {
    expect(
      composeLocation(draft({ regionPath: ["ocean", "ocean.atlantic_ocean"] })),
    ).toEqual({ region: { kind: "ocean", oceanSea: "atlantic_ocean" } });
  });

  it("should drop navigation type when there is no position", () => {
    expect(composeLocation(draft({ navigationType: "GPS" }))).toBeNull();
  });

  it("should keep navigation type alongside a position", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 3,
          latitude: 45,
          navigationType: "GPS",
        }),
      ),
    ).toEqual({
      position: { type: "point", longitude: 3, latitude: 45 },
      navigationType: "GPS",
    });
  });
});

describe("toLocationDraft", () => {
  it("should return a draft with every field unset for a null location", () => {
    const set = Object.entries(toLocationDraft(null)).filter(
      ([, value]) => value !== undefined,
    );
    expect(set).toEqual([
      ["verticalPositions", []],
      ["regionPath", []],
    ]);
  });

  it.each<Location>([
    {
      position: {
        type: "point",
        longitude: 3.5,
        latitude: -45,
      },
      verticalPositions: [
        { reference: "bathymetry", system: "msl", start: 1200, end: 1200 },
      ],
      region: { kind: "country", country: "FR" },
      navigationType: "GPS",
      localityName: "Vent field",
    },
    {
      position: {
        type: "area",
        westLongitude: 1,
        eastLongitude: 2,
        southLatitude: 3,
        northLatitude: 4,
      },
      verticalPositions: [
        {
          reference: "depth_below_ground",
          system: "evrf2019",
          start: 100,
          end: 800,
        },
      ],
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
    },
    { region: { kind: "country" } },
    {
      position: {
        type: "line",
        startLongitude: 1,
        startLatitude: 2,
        endLongitude: 3,
        endLatitude: 4,
      },
      verticalPositions: [
        { reference: "core_depth", system: "local", start: 90, end: 10 },
      ],
    },
  ])("should round-trip through the draft", (location) => {
    expect(composeLocation(toLocationDraft(location))).toEqual(location);
  });
});

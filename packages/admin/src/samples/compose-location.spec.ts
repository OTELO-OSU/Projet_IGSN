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

  it("should compose a point position with elevation", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 3.5,
          latitude: -45,
          elevationValue: -1200,
          elevationUnit: "m",
          elevationDatum: "msl",
        }),
      ),
    ).toEqual({
      position: {
        type: "point",
        longitude: 3.5,
        latitude: -45,
        elevation: { min: -1200, max: -1200, unit: "m", datum: "msl" },
      },
    });
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
    expect(composeLocation(draft({ regionKind: "continent" }))).toEqual({
      region: { kind: "continent" },
    });
  });

  it("should compose a continent region and drop a blank locality", () => {
    expect(
      composeLocation(
        draft({ regionKind: "continent", country: "FR", localityName: "  " }),
      ),
    ).toEqual({ region: { kind: "continent", country: "FR" } });
  });

  it("should compose an ocean region", () => {
    expect(
      composeLocation(
        draft({ regionKind: "ocean", oceanSea: "atlantic_ocean" }),
      ),
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

  it("should keep an entered elevation missing its unit and datum for the schema to reject", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 0,
          latitude: 0,
          elevationValue: 100,
        }),
      ),
    ).toEqual({
      position: {
        type: "point",
        longitude: 0,
        latitude: 0,
        elevation: { min: 100, max: 100 },
      },
    });
  });

  it("should exclude a unit and datum left behind by an emptied elevation", () => {
    // Those fields are disabled without a value, so a schema error on them
    // could never be fixed; a lingering selection is not entered data.
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 0,
          latitude: 0,
          elevationUnit: "m",
          elevationDatum: "msl",
        }),
      ),
    ).toEqual({ position: { type: "point", longitude: 0, latitude: 0 } });
  });
});

describe("toLocationDraft", () => {
  it("should return a draft with every field unset for a null location", () => {
    expect(
      Object.values(toLocationDraft(null)).every(
        (value) => value === undefined,
      ),
    ).toBe(true);
  });

  it.each<Location>([
    {
      position: {
        type: "point",
        longitude: 3.5,
        latitude: -45,
        elevation: { min: -1200, max: -1200, unit: "m", datum: "msl" },
      },
      region: { kind: "continent", country: "FR" },
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
        elevation: { min: -100, max: 0, unit: "km", datum: "wgs84" },
      },
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
    },
  ])("should round-trip through the draft", (location) => {
    expect(composeLocation(toLocationDraft(location))).toEqual(location);
  });
});

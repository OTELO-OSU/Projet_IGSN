import type { Location } from "@projet-igsn/domain/sample/location/model";

import { describe, expect, it } from "vitest";

import {
  composeLocation,
  emptyLocationDraft,
  type LocationDraft,
  toLocationDraft,
} from "./compose-location.ts";

const draft = (over: Partial<LocationDraft>): LocationDraft => ({
  ...emptyLocationDraft,
  ...over,
});

describe("composeLocation", () => {
  it("should return null for an empty draft", () => {
    expect(composeLocation(emptyLocationDraft)).toBeNull();
  });

  it("should compose a point position with elevation", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: "3.5",
          latitude: "-45",
          elevationValue: "-1200",
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
          westLongitude: "1",
          eastLongitude: "2",
          southLatitude: "3",
          northLatitude: "4",
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

  it("should drop an incomplete point position but keep a locality", () => {
    expect(
      composeLocation(
        draft({ type: "point", longitude: "3", localityName: "Vent field" }),
      ),
    ).toEqual({ localityName: "Vent field" });
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

  it("should drop elevation when unit or datum is missing", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: "0",
          latitude: "0",
          elevationValue: "100",
        }),
      ),
    ).toEqual({ position: { type: "point", longitude: 0, latitude: 0 } });
  });
});

describe("toLocationDraft", () => {
  it("should return the empty draft for a null location", () => {
    expect(toLocationDraft(null)).toEqual(emptyLocationDraft);
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

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

  it("should compose a point position with its vertical position", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 3.5,
          latitude: -45,
          verticalPosition: 1200,
          verticalReference: "bathymetry",
          verticalReferenceSystem: "msl",
        }),
      ),
    ).toEqual({
      position: {
        type: "point",
        longitude: 3.5,
        latitude: -45,
        vertical: { position: 1200, reference: "bathymetry", system: "msl" },
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

  it("should keep a vertical position missing its reference and system for the schema to reject", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 0,
          latitude: 0,
          verticalPosition: 100,
        }),
      ),
    ).toEqual({
      position: {
        type: "point",
        longitude: 0,
        latitude: 0,
        vertical: { position: 100 },
      },
    });
  });

  it("should keep a reference and system entered without a value", () => {
    expect(
      composeLocation(
        draft({
          type: "point",
          longitude: 0,
          latitude: 0,
          verticalReference: "depth_below_ground",
          verticalReferenceSystem: "msl",
        }),
      ),
    ).toEqual({
      position: {
        type: "point",
        longitude: 0,
        latitude: 0,
        vertical: { reference: "depth_below_ground", system: "msl" },
      },
    });
  });
});

describe("toLocationDraft", () => {
  it("should return a draft with every field unset for a null location", () => {
    const set = Object.entries(toLocationDraft(null)).filter(
      ([, value]) => value !== undefined,
    );
    expect(set).toEqual([]);
  });

  it.each<Location>([
    {
      position: {
        type: "point",
        longitude: 3.5,
        latitude: -45,
        vertical: { position: 1200, reference: "bathymetry", system: "msl" },
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
        vertical: {
          min: 100,
          max: 800,
          reference: "depth_below_ground",
          system: "evrf2019",
        },
      },
      region: { kind: "ocean", oceanSea: "atlantic_ocean" },
    },
    {
      position: {
        type: "line",
        startLongitude: 1,
        startLatitude: 2,
        endLongitude: 3,
        endLatitude: 4,
        vertical: {
          start: 10,
          end: 90,
          reference: "core_depth",
          system: "local",
        },
      },
    },
  ])("should round-trip through the draft", (location) => {
    expect(composeLocation(toLocationDraft(location))).toEqual(location);
  });
});

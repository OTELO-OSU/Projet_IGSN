import { describe, expect, it } from "vitest";

import { toSample } from "./to-sample.ts";

const row = {
  id: "018f4d3a-1f2b-7c00-8000-000000000000",
  name: "Grès de Fontainebleau",
  nature: "rock_powder",
  type: "dredge",
  material: "rock.igneous.plutonic.felsic.granite",
  texture: "phaneritic",
  metamorphic_facies: null,
  collection_method: "coring.gravity_corer",
  collection_method_description: "Giant corer, 20 m barrel",
  specific_name: "FTB-2026-042",
  collection_date_start: null,
  collection_date_end: null,
  oriented: null,
  orientation_explanation: null,
  open_description: null,
  length_value: null,
  length_unit: null,
  width_value: null,
  width_unit: null,
  thickness_value: null,
  thickness_unit: null,
  mass_value: null,
  mass_unit: null,
  volume_value: null,
  volume_unit: null,
  location_type: null,
  point_longitude: null,
  point_latitude: null,
  area_west_longitude: null,
  area_east_longitude: null,
  area_south_latitude: null,
  area_north_latitude: null,
  elevation_min: null,
  elevation_max: null,
  elevation_unit: null,
  vertical_datum: null,
  navigation_type: null,
  region_kind: null,
  country: null,
  ocean_sea: null,
  locality_name: null,
  locality_description: null,
  geom: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  published: false,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

describe("toSample", () => {
  it("should map a db row to a domain Sample with camelCase fields", () => {
    // Act
    const sample = toSample(row);
    // Assert
    expect(sample).toEqual({
      id: "018f4d3a-1f2b-7c00-8000-000000000000",
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: "dredge",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
      metamorphicFacies: null,
      collectionMethod: "coring.gravity_corer",
      collectionMethodDescription: "Giant corer, 20 m barrel",
      specificName: "FTB-2026-042",
      location: null,
      description: null,
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
      published: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("should map location columns to a nested location", () => {
    const sample = toSample({
      ...row,
      location_type: "point",
      point_longitude: 2.35,
      point_latitude: 48.85,
    });
    expect(sample.location).toEqual({
      position: { type: "point", longitude: 2.35, latitude: 48.85 },
    });
  });

  it("should throw when the nature is not a known value", () => {
    expect(() => toSample({ ...row, nature: "inconnu" })).toThrow();
  });

  it("should throw when the type is not a known taxonomy path", () => {
    expect(() => toSample({ ...row, type: "half_round" })).toThrow();
  });

  it("should throw when the collection method is not a known taxonomy path", () => {
    expect(() =>
      toSample({ ...row, collection_method: "gravity_corer" }),
    ).toThrow();
  });

  it("should throw when the name is empty", () => {
    expect(() => toSample({ ...row, name: "" })).toThrow();
  });

  it("should throw when the id is not a uuid", () => {
    expect(() => toSample({ ...row, id: "pas-un-uuid" })).toThrow();
  });
});

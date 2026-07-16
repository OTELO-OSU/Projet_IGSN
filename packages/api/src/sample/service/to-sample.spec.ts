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
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  published: false,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

const ageRow = {
  sample_id: "018f4d3a-1f2b-7c00-8000-000000000000",
  numeric_age: 12000,
  numeric_age_unit: "a",
  numeric_age_years_unit: "bp",
  numeric_age_min: null,
  numeric_age_min_unit: null,
  numeric_age_min_years_unit: null,
  numeric_age_max: null,
  numeric_age_max_unit: null,
  numeric_age_max_years_unit: null,
  geological_age: "ics8",
  geological_age_min: null,
  geological_age_max: null,
  geological_unit: null,
};

describe("toSample", () => {
  it("should map a db row to a domain Sample with camelCase fields", () => {
    // Act
    const sample = toSample(row, null);
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
      age: null,
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
      published: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("should carry the location through", () => {
    const location = {
      position: { type: "point" as const, longitude: 2.35, latitude: 48.85 },
    };
    expect(toSample(row, location).location).toEqual(location);
  });

  it("should map an age row to the sample's age", () => {
    // Act
    const sample = toSample(row, null, ageRow);
    // Assert
    expect(sample.age).toEqual({
      numericAge: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
      numericAgeMin: null,
      numericAgeMinUnit: null,
      numericAgeMinYearsUnit: null,
      numericAgeMax: null,
      numericAgeMaxUnit: null,
      numericAgeMaxYearsUnit: null,
      geologicalAge: "ics8",
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    });
  });

  it("should throw when the age carries an unknown geological code", () => {
    expect(() =>
      toSample(row, null, { ...ageRow, geological_age: "ics99" }),
    ).toThrow();
  });

  it("should throw when the nature is not a known value", () => {
    expect(() => toSample({ ...row, nature: "inconnu" }, null)).toThrow();
  });

  it("should throw when the type is not a known taxonomy path", () => {
    expect(() => toSample({ ...row, type: "half_round" }, null)).toThrow();
  });

  it("should throw when the collection method is not a known taxonomy path", () => {
    expect(() =>
      toSample({ ...row, collection_method: "gravity_corer" }, null),
    ).toThrow();
  });

  it("should throw when the name is empty", () => {
    expect(() => toSample({ ...row, name: "" }, null)).toThrow();
  });

  it("should throw when the id is not a uuid", () => {
    expect(() => toSample({ ...row, id: "pas-un-uuid" }, null)).toThrow();
  });
});

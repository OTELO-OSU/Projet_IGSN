import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

const base: Sample = {
  id: "00000000-0000-7000-8000-000000000001",
  name: "Basalt 42",
  nature: "hand_sample",
  type: "individual_sample",
  material: "rock.igneous.plutonic.felsic.granite",
  texture: null,
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "BAS-42-001",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  age: null,
  igsn: null,
  published: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("samplePublishBlockers", () => {
  it("should report no blockers when the type and material path are leaves", () => {
    expect(samplePublishBlockers(base)).toEqual([]);
  });

  it("should report type_missing when type is null", () => {
    expect(samplePublishBlockers({ ...base, type: null })).toEqual([
      "type_missing",
    ]);
  });

  it("should report type_incomplete when the type is an ancestor path", () => {
    expect(samplePublishBlockers({ ...base, type: "core" })).toEqual([
      "type_incomplete",
    ]);
  });

  it("should report both type and material blockers independently", () => {
    expect(
      samplePublishBlockers({ ...base, type: null, material: null }),
    ).toEqual(["type_missing", "material_missing"]);
  });

  it("should report material_missing when material is null", () => {
    expect(samplePublishBlockers({ ...base, material: null })).toEqual([
      "material_missing",
    ]);
  });

  it("should report material_incomplete when the path is an internal node", () => {
    expect(samplePublishBlockers({ ...base, material: "rock" })).toEqual([
      "material_incomplete",
    ]);
  });

  it("should report metamorphic_facies_missing for a metamorphic sample without a facies", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: null,
      }),
    ).toEqual(["metamorphic_facies_missing"]);
  });

  it("should not report metamorphic_facies_missing once the facies is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
      }),
    ).toEqual([]);
  });

  it("should not require a facies for a non-metamorphic sample", () => {
    expect(samplePublishBlockers({ ...base, metamorphicFacies: null })).toEqual(
      [],
    );
  });

  it("should report metamorphic_facies_missing for an out-of-vocabulary facies", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "bogus" as Sample["metamorphicFacies"],
      }),
    ).toEqual(["metamorphic_facies_missing"]);
  });

  it("should report a blocker for a value outside the vocabulary rather than treat it as publishable", () => {
    expect(
      samplePublishBlockers({
        ...base,
        type: "not_a_type",
        material: "not_a_material",
      }),
    ).toEqual(["type_incomplete", "material_incomplete"]);
  });

  it("should report location_position_missing when a required material has no position", () => {
    expect(samplePublishBlockers({ ...base, location: null })).toEqual([
      "location_position_missing",
    ]);
  });

  it("should report location_position_missing when a location has no position", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: { localityName: "Somewhere" },
      }),
    ).toEqual(["location_position_missing"]);
  });

  it("should not require a location for synthetic material", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "synthetic_rock_mineral",
        location: null,
      }),
    ).toEqual([]);
  });

  it("should not require a location for an extraterrestrial returned sample", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "extraterrestrial_rock.returned_samples.other",
        location: null,
      }),
    ).toEqual([]);
  });

  it("should not add a location blocker while the material is still incomplete", () => {
    expect(
      samplePublishBlockers({ ...base, material: "rock", location: null }),
    ).toEqual(["material_incomplete"]);
  });

  it("should report elevation_unit_datum_missing when an elevation has no unit or datum", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: {
          position: {
            type: "point",
            longitude: 0,
            latitude: 0,
            elevation: { min: 10, max: 10 },
          },
        },
      }),
    ).toEqual(["elevation_unit_datum_missing"]);
  });

  it("should report elevation_unit_datum_missing when only the unit is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: {
          position: {
            type: "point",
            longitude: 0,
            latitude: 0,
            elevation: { min: 10, max: 10, unit: "m" },
          },
        },
      }),
    ).toEqual(["elevation_unit_datum_missing"]);
  });

  it("should report elevation_range_incomplete when only one bound is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: {
          position: {
            type: "area",
            westLongitude: 5,
            eastLongitude: 8,
            southLatitude: 44,
            northLatitude: 46,
            elevation: { min: 0, unit: "m", datum: "msl" },
          },
        },
      }),
    ).toEqual(["elevation_range_incomplete"]);
  });

  it("should not report an elevation blocker for a complete elevation", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: {
          position: {
            type: "point",
            longitude: 0,
            latitude: 0,
            elevation: { min: 10, max: 10, unit: "m", datum: "msl" },
          },
        },
      }),
    ).toEqual([]);
  });

  const emptyAge: NonNullable<Sample["age"]> = {
    numericAge: null,
    numericAgeUnit: null,
    numericAgeYearsUnit: null,
    numericAgeMin: null,
    numericAgeMinUnit: null,
    numericAgeMinYearsUnit: null,
    numericAgeMax: null,
    numericAgeMaxUnit: null,
    numericAgeMaxYearsUnit: null,
    geologicalAge: null,
    geologicalAgeMin: null,
    geologicalAgeMax: null,
    geologicalUnit: null,
  };

  it("should not require an age to publish", () => {
    expect(samplePublishBlockers({ ...base, age: null })).toEqual([]);
  });

  it("should report numeric_age_unit_missing when a numeric value has no unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAge: 120 },
      }),
    ).toEqual(["numeric_age_unit_missing"]);
  });

  it("should report numeric_age_unit_missing when a range bound has no unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          numericAgeMin: 500,
          numericAgeMinUnit: "ka",
          numericAgeMax: 2,
          numericAgeMaxUnit: null,
        },
      }),
    ).toEqual(["numeric_age_unit_missing"]);
  });

  it("should not report a blocker when every numeric value has its unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAge: 120, numericAgeUnit: "ma" },
      }),
    ).toEqual([]);
  });

  it("should not report a blocker for a stratigraphic-only age", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, geologicalAge: "ics8" },
      }),
    ).toEqual([]);
  });

  it("should report numeric_age_range_incomplete when only one numeric bound is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAgeMin: 100, numericAgeMinUnit: "ma" },
      }),
    ).toEqual(["numeric_age_range_incomplete"]);
  });

  it("should report geological_age_range_incomplete when only one stratigraphic bound is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, geologicalAgeMax: "ics12" },
      }),
    ).toEqual(["geological_age_range_incomplete"]);
  });

  it("should not report a range blocker once both bounds are set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          numericAgeMin: 100,
          numericAgeMinUnit: "ma",
          numericAgeMax: 140,
          numericAgeMaxUnit: "ma",
          geologicalAgeMin: "ics8",
          geologicalAgeMax: "ics12",
        },
      }),
    ).toEqual([]);
  });

  it("should report numeric_age_reference_missing when an annum value has no reference", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAge: 120, numericAgeUnit: "a" },
      }),
    ).toEqual(["numeric_age_reference_missing"]);
  });

  it("should report numeric_age_reference_missing when an annum range bound has no reference", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          numericAgeMin: 100,
          numericAgeMinUnit: "a",
          numericAgeMinYearsUnit: "bp",
          numericAgeMax: 140,
          numericAgeMaxUnit: "a",
        },
      }),
    ).toEqual(["numeric_age_reference_missing"]);
  });

  it("should not report numeric_age_reference_missing once the annum value has a reference", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          numericAge: 120,
          numericAgeUnit: "a",
          numericAgeYearsUnit: "bp",
        },
      }),
    ).toEqual([]);
  });

  it("should not require a reference for a non-annum unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAge: 120, numericAgeUnit: "ka" },
      }),
    ).toEqual([]);
  });
});

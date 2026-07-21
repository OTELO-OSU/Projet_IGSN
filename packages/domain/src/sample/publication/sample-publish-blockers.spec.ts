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
  description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
  condition: null,
  scientificContext: null,
  age: null,
  links: [],
  attachments: [],
  security: null,
  availability: "exists",
  publicationYear: null,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
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

  it("should report availability_missing when availability is null", () => {
    expect(samplePublishBlockers({ ...base, availability: null })).toEqual([
      "availability_missing",
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

  it("should report collection_date_missing when the sample has no description", () => {
    expect(samplePublishBlockers({ ...base, description: null })).toEqual([
      "collection_date_missing",
    ]);
  });

  it("should report collection_date_missing when the description has no collection date", () => {
    expect(
      samplePublishBlockers({
        ...base,
        description: { openDescription: "Coarse-grained" },
      }),
    ).toEqual(["collection_date_missing"]);
  });

  const emptyAge: NonNullable<Sample["age"]> = {
    numericAgeMin: null,
    numericAgeMax: null,
    numericAgeUnit: null,
    numericAgeYearsUnit: null,
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
        age: { ...emptyAge, numericAgeMin: 120, numericAgeMax: 120 },
      }),
    ).toEqual(["numeric_age_unit_missing"]);
  });

  it("should report numeric_age_unit_missing when a range has no unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAgeMin: 500, numericAgeMax: 2000 },
      }),
    ).toEqual(["numeric_age_unit_missing"]);
  });

  it("should not report a blocker when a numeric value has its unit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          numericAgeMin: 120,
          numericAgeMax: 120,
          numericAgeUnit: "ma",
        },
      }),
    ).toEqual([]);
  });

  it("should not report a blocker for a stratigraphic-only age", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: {
          ...emptyAge,
          geologicalAgeMin: "ics8",
          geologicalAgeMax: "ics8",
        },
      }),
    ).toEqual([]);
  });

  it("should report numeric_age_range_incomplete when only one numeric bound is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        age: { ...emptyAge, numericAgeMin: 100, numericAgeUnit: "ma" },
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
          numericAgeMax: 140,
          numericAgeUnit: "ma",
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
        age: {
          ...emptyAge,
          numericAgeMin: 120,
          numericAgeMax: 120,
          numericAgeUnit: "a",
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
          numericAgeMin: 120,
          numericAgeMax: 120,
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
        age: {
          ...emptyAge,
          numericAgeMin: 120,
          numericAgeMax: 120,
          numericAgeUnit: "ka",
        },
      }),
    ).toEqual([]);
  });

  const withElevation = (
    elevation: NonNullable<
      NonNullable<NonNullable<Sample["location"]>["position"]>
    >["elevation"],
  ): Sample => ({
    ...base,
    location: {
      position: { type: "point", longitude: 0, latitude: 0, elevation },
    },
  });

  it("should not require an elevation to publish", () => {
    expect(samplePublishBlockers(base)).toEqual([]);
  });

  it("should not report a blocker for a complete elevation", () => {
    expect(
      samplePublishBlockers(
        withElevation({ min: -2500, max: -2500, unit: "m", datum: "msl" }),
      ),
    ).toEqual([]);
  });

  it.each([
    ["a missing bound", { min: 100, max: null, unit: "m", datum: "msl" }],
    ["a missing unit", { min: 100, max: 200, unit: null, datum: "msl" }],
    ["a missing datum", { min: 100, max: 200, unit: "m", datum: null }],
  ] as const)(
    "should report elevation_incomplete for %s",
    (_label, elevation) => {
      expect(samplePublishBlockers(withElevation(elevation))).toEqual([
        "elevation_incomplete",
      ]);
    },
  );
});

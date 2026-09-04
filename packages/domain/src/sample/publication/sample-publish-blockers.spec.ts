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
  repository: { currentArchive: "02feahw73" },
  geologicalContextDescription: null,
  geomorphologicalEnvironment: null,
  scientificContext: {
    provenanceStatus: "field_sample",
    funderOrganizations: ["02feahw73"],
    researchProgramName: "Deep Biosphere Survey",
    chiefScientist: "Marie Curie",
    hostInstitution: ["04kdfz702"],
    collectorName: "Pierre Curie",
  },
  syntheticDetails: null,
  age: null,
  relations: [],
  attachments: [],
  security: null,
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: null,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  owner: null,
  manualGroups: [],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "draft",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const syntheticDetails = {
  startingMaterial: "natural",
  startingMaterialNature: "rock",
  finalProduct: "glass",
  experimentDuration: { value: 2, unit: "hour" },
  synthesisDate: { start: "2020-01-01", end: "2020-01-02" },
  operatorName: "Marie Curie",
} as const;

const synthetic: Sample = {
  ...base,
  material: "synthetic_rock_mineral",
  location: null,
  syntheticDetails,
};

describe("samplePublishBlockers", () => {
  it("should report no blockers when the type and material path are leaves", () => {
    expect(samplePublishBlockers(base)).toEqual([]);
  });

  it.each([{ repository: null }, { repository: { currentArchive: null } }])(
    "should report current_archive_missing for %o",
    (overrides) => {
      expect(samplePublishBlockers({ ...base, ...overrides })).toEqual([
        "current_archive_missing",
      ]);
    },
  );

  it("should report type_missing when type is null", () => {
    expect(samplePublishBlockers({ ...base, type: null })).toEqual([
      "type_missing",
    ]);
  });

  it("should report existence_status_missing when the existence status is null", () => {
    expect(samplePublishBlockers({ ...base, existenceStatus: null })).toEqual([
      "existence_status_missing",
    ]);
  });

  it("should report availability_status_missing when the availability status is null", () => {
    expect(
      samplePublishBlockers({ ...base, availabilityStatus: null }),
    ).toEqual(["availability_status_missing"]);
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

  it.each<[string, Sample["location"]]>([
    ["a required material has no location", null],
    ["a location has no position", { localityName: "Somewhere" }],
  ])("should report location_position_missing when %s", (_label, location) => {
    expect(samplePublishBlockers({ ...base, location })).toEqual([
      "location_position_missing",
    ]);
  });

  it("should not require a location for synthetic material", () => {
    expect(samplePublishBlockers(synthetic)).toEqual([]);
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

  it.each<[string, Sample["description"]]>([
    ["the sample has no description", null],
    [
      "the description has no collection date",
      { openDescription: "Coarse-grained" },
    ],
  ])("should report collection_date_missing when %s", (_label, description) => {
    expect(samplePublishBlockers({ ...base, description })).toEqual([
      "collection_date_missing",
    ]);
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

  it.each([
    [120, 120],
    [500, 2000],
  ])(
    "should report numeric_age_unit_missing when the bounds %s-%s have no unit",
    (min, max) => {
      expect(
        samplePublishBlockers({
          ...base,
          age: { ...emptyAge, numericAgeMin: min, numericAgeMax: max },
        }),
      ).toEqual(["numeric_age_unit_missing"]);
    },
  );

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
          geologicalAgeMin: 8,
          geologicalAgeMax: 8,
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
        age: { ...emptyAge, geologicalAgeMax: 12 },
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
          geologicalAgeMin: 8,
          geologicalAgeMax: 12,
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

  type Position = NonNullable<
    NonNullable<NonNullable<Sample["location"]>["position"]>
  >;

  const withPosition = (position: Position): Sample => ({
    ...base,
    location: { position },
  });

  const areaPosition = {
    type: "area",
    westLongitude: 5,
    eastLongitude: 8,
    southLatitude: 44,
    northLatitude: 46,
  } as const;
  const linePosition = {
    type: "line",
    startLongitude: 5,
    startLatitude: 44,
    endLongitude: 8,
    endLatitude: 46,
  } as const;
  const pointPosition = { type: "point", longitude: 0, latitude: 0 } as const;
  const meta = { reference: "bathymetry", system: "msl" } as const;

  it.each<[string, Position]>([
    ["a point", { ...pointPosition, vertical: { position: 2500, ...meta } }],
    ["an area", { ...areaPosition, vertical: { min: 0, max: 100, ...meta } }],
    ["a line", { ...linePosition, vertical: { start: 0, end: 100, ...meta } }],
  ])(
    "should not report a blocker for a complete vertical position on %s",
    (_label, position) => {
      expect(samplePublishBlockers(withPosition(position))).toEqual([]);
    },
  );

  it.each<[string, Position]>([
    [
      "a point without its position",
      { ...pointPosition, vertical: { position: null, ...meta } },
    ],
    [
      "an area missing a bound",
      { ...areaPosition, vertical: { min: 100, max: null, ...meta } },
    ],
    [
      "a line missing an endpoint",
      { ...linePosition, vertical: { start: null, end: 100, ...meta } },
    ],
    [
      "a missing reference",
      {
        ...pointPosition,
        vertical: { position: 100, reference: null, system: "msl" },
      },
    ],
  ])(
    "should report vertical_position_incomplete for %s",
    (_label, position) => {
      expect(samplePublishBlockers(withPosition(position))).toEqual([
        "vertical_position_incomplete",
      ]);
    },
  );

  it("should not require a vertical reference system to publish", () => {
    expect(
      samplePublishBlockers(
        withPosition({
          ...pointPosition,
          vertical: { position: 100, reference: "bathymetry", system: null },
        }),
      ),
    ).toEqual([]);
  });

  it("should report scientific_context_missing when there is no context", () => {
    expect(samplePublishBlockers({ ...base, scientificContext: null })).toEqual(
      ["scientific_context_missing"],
    );
  });

  it("should report each missing mandatory field of the recent-collection branch", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: { provenanceStatus: "field_sample" },
      }),
    ).toEqual([
      "funder_organizations_missing",
      "research_program_name_missing",
      "chief_scientist_missing",
      "host_institution_missing",
      "collector_name_missing",
    ]);
  });

  it("should report only the still-missing recent-collection fields", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          funderOrganizations: ["02feahw73"],
          researchProgramName: "Deep Biosphere Survey",
          chiefScientist: "Marie Curie",
        },
      }),
    ).toEqual(["host_institution_missing", "collector_name_missing"]);
  });

  it("should report the missing mandatory fields of the historical-specimen branch", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: { provenanceStatus: "collection_specimen" },
      }),
    ).toEqual(["collection_curator_missing", "collection_origin_missing"]);
  });

  it("should report no blocker for a complete historical-specimen context", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionCurator: "Georges Cuvier",
          collectionOrigin: "scientific_expedition",
        },
      }),
    ).toEqual([]);
  });

  it("should not report a synthetic blocker for a non-synthetic material", () => {
    expect(
      samplePublishBlockers({
        ...base,
        syntheticDetails: { finalProduct: "glass" },
      }),
    ).toEqual([]);
  });

  it("should report every required synthesis field when the section is missing", () => {
    expect(
      samplePublishBlockers({ ...synthetic, syntheticDetails: null }),
    ).toEqual([
      "synthetic_starting_material_missing",
      "synthetic_starting_material_nature_missing",
      "synthetic_final_product_missing",
      "synthetic_experiment_duration_missing",
      "synthetic_synthesis_date_missing",
      "synthetic_operator_name_missing",
    ]);
  });

  it.each(["synthetic", "mixture"] as const)(
    "should require the starting material composition of a %s starting material",
    (startingMaterial) => {
      expect(
        samplePublishBlockers({
          ...synthetic,
          syntheticDetails: {
            ...syntheticDetails,
            startingMaterial,
          },
        }),
      ).toEqual(["synthetic_starting_material_composition_missing"]);
    },
  );

  it.each([
    { experimentDuration: { value: 2, unit: "hour" } as const },
    { experimentDurationNotRelevant: true },
  ])("should lift the experiment duration blocker with %o", (override) => {
    expect(
      samplePublishBlockers({
        ...synthetic,
        syntheticDetails: {
          ...syntheticDetails,
          experimentDuration: null,
          ...override,
        },
      }),
    ).toEqual([]);
  });

  it("should report attachment_limit_exceeded above the default limit", () => {
    expect(
      samplePublishBlockers({ ...base, attachments: Array(6).fill({}) }),
    ).toEqual(["attachment_limit_exceeded"]);
  });

  it("should report no blocker at the default limit", () => {
    expect(
      samplePublishBlockers({ ...base, attachments: Array(5).fill({}) }),
    ).toEqual([]);
  });

  it("should honour an explicit upload limit", () => {
    expect(
      samplePublishBlockers({ ...base, attachments: Array(4).fill({}) }, 3),
    ).toEqual(["attachment_limit_exceeded"]);
    expect(
      samplePublishBlockers({ ...base, attachments: Array(3).fill({}) }, 3),
    ).toEqual([]);
  });

  it("should never report attachment_limit_exceeded when attachments are omitted", () => {
    const { attachments: _attachments, ...withoutAttachments } = base;
    expect(samplePublishBlockers(withoutAttachments, 1)).toEqual([]);
  });

  it("should report user_not_verified for a pending or rejected publisher", () => {
    expect(
      samplePublishBlockers(base, undefined, {
        status: "pending",
        superAdmin: false,
      }),
    ).toEqual(["user_not_verified"]);
    expect(
      samplePublishBlockers(base, undefined, {
        status: "rejected",
        superAdmin: false,
      }),
    ).toEqual(["user_not_verified"]);
  });

  it("should report no blocker for an accepted publisher or a super admin", () => {
    expect(
      samplePublishBlockers(base, undefined, {
        status: "accepted",
        superAdmin: false,
      }),
    ).toEqual([]);
    expect(
      samplePublishBlockers(base, undefined, {
        status: "pending",
        superAdmin: true,
      }),
    ).toEqual([]);
  });

  it("should report the field blockers alongside user_not_verified", () => {
    expect(
      samplePublishBlockers({ ...base, existenceStatus: null }, undefined, {
        status: "pending",
        superAdmin: false,
      }),
    ).toEqual(["existence_status_missing", "user_not_verified"]);
  });
});

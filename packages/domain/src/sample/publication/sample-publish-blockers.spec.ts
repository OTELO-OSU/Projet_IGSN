import { describe, expect, it } from "vitest";

import type { SampleAttachment } from "../attachment/model.ts";
import type { SampleProcessStep } from "../process-step/model.ts";
import type { SampleRelation } from "../relation/model.ts";
import type { Sample } from "../sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

const base: Sample = {
  id: "00000000-0000-7000-8000-000000000001",
  name: "Basalt 42",
  nature: "hand_sample",
  type: "individual_sample",
  material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "BAS-42-001",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  description: {
    collectionDate: {
      precision: "day",
      start: "2026-01-01",
      end: "2026-01-01",
    },
  },
  condition: null,
  repository: { currentArchive: "02feahw73" },
  geologicalContextDescription: null,
  physiographicEnvironment: null,
  scientificContext: {
    provenanceStatus: "field_sample",
    funderOrganizations: ["02feahw73"],
    researchProgramName: "Deep Biosphere Survey",
    chiefScientistFirstname: "Marie",
    chiefScientistLastname: "Curie",
    hostInstitution: ["04kdfz702"],
    collectorFirstname: "Pierre",
    collectorLastname: "Curie",
  },
  syntheticDetails: null,
  age: null,
  relations: [],
  processSteps: [],
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
  doiPrefix: null,
  owner: null,
  manualGroups: [],
  parents: [],
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
  synthesisDate: { precision: "day", start: "2020-01-01", end: "2020-01-02" },
  operatorFirstname: "Marie",
  operatorLastname: "Curie",
} as const;

const synthetic: Sample = {
  ...base,
  material: "rock_and_sediment.synthetic_rock_mineral",
  location: null,
  syntheticDetails,
};

const LINKED_USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

describe("samplePublishBlockers", () => {
  it("should report no blockers when the type and material path are leaves", () => {
    expect(samplePublishBlockers(base)).toEqual([]);
  });

  it("should report nature_missing when the sample has no nature", () => {
    expect(samplePublishBlockers({ ...base, nature: null })).toEqual([
      "nature_missing",
    ]);
  });

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

  it("should report material_incomplete for a family, which has sub-levels", () => {
    expect(
      samplePublishBlockers({ ...base, material: "rock_and_sediment.rock" }),
    ).toEqual(["material_incomplete"]);
  });

  it("should publish a material stopped at its third level", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock_and_sediment.rock.igneous",
      }),
    ).toEqual([]);
  });

  it("should report material_other_name_missing when the other material has no free text", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock_and_sediment.rock.other",
      }),
    ).toEqual(["material_other_name_missing"]);
  });

  it("should publish the other material once it is named", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock_and_sediment.rock.other",
        materialOtherName: "Impactite",
      }),
    ).toEqual([]);
  });

  it("should publish the family mineral, which has no sub-level", () => {
    expect(
      samplePublishBlockers({ ...base, material: "rock_and_sediment.mineral" }),
    ).toEqual([]);
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
        material:
          "rock_and_sediment.extraterrestrial_rock.returned_samples.other",
        location: null,
      }),
    ).toEqual([]);
  });

  it("should not require a location for a collection specimen", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: null,
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionCuratorFirstname: "Alexander",
          collectionCuratorLastname: "von Humboldt",
          collectionOrigin: "scientific_expedition",
        },
      }),
    ).toEqual([]);
  });

  it("should require a location once the material reaches its second level", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock_and_sediment.rock.igneous",
        location: null,
      }),
    ).toEqual(["location_position_missing"]);
  });

  it("should not add a location blocker while the material is still incomplete", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock_and_sediment.rock",
        location: null,
      }),
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

  it("should report numeric_age_unit_missing when the bounds have no unit", () => {
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

  it("should report each missing mandatory field of the field-sample branch", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: { provenanceStatus: "field_sample" },
      }),
    ).toEqual(["collector_firstname_missing", "collector_lastname_missing"]);
  });

  it.each([
    [
      "the firstname alone",
      { collectorFirstname: "Pierre" },
      "collector_lastname_missing",
    ],
    [
      "the lastname alone",
      { collectorLastname: "Curie" },
      "collector_firstname_missing",
    ],
  ] as const)(
    "should report the missing half when a field sample names %s of the collector",
    (_case, collector, blocker) => {
      expect(
        samplePublishBlockers({
          ...base,
          scientificContext: { provenanceStatus: "field_sample", ...collector },
        }),
      ).toEqual([blocker]);
    },
  );

  it.each([
    [
      "the firstname alone",
      { chiefScientistFirstname: "Marie" },
      "chief_scientist_lastname_missing",
    ],
    [
      "the lastname alone",
      { chiefScientistLastname: "Curie" },
      "chief_scientist_firstname_missing",
    ],
  ] as const)(
    "should report the missing half when a field sample names %s of the chief scientist",
    (_case, chiefScientist, blocker) => {
      expect(
        samplePublishBlockers({
          ...base,
          scientificContext: {
            provenanceStatus: "field_sample",
            collectorFirstname: "Pierre",
            collectorLastname: "Curie",
            ...chiefScientist,
          },
        }),
      ).toEqual([blocker]);
    },
  );

  it("should report no blocker for a field sample naming no chief scientist at all", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorFirstname: "Pierre",
          collectorLastname: "Curie",
        },
      }),
    ).toEqual([]);
  });

  it("should report the missing mandatory fields of the collection-specimen branch", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: { provenanceStatus: "collection_specimen" },
      }),
    ).toEqual([
      "collection_curator_firstname_missing",
      "collection_curator_lastname_missing",
      "collection_origin_missing",
    ]);
  });

  it("should report no blocker for a complete collection-specimen context", () => {
    expect(
      samplePublishBlockers({
        ...base,
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionCuratorFirstname: "Georges",
          collectionCuratorLastname: "Cuvier",
          collectionOrigin: "scientific_expedition",
        },
      }),
    ).toEqual([]);
  });

  it.each([
    [
      "the firstname alone",
      { collectionCuratorFirstname: "Georges" },
      "collection_curator_lastname_missing",
    ],
    [
      "the lastname alone",
      { collectionCuratorLastname: "Cuvier" },
      "collection_curator_firstname_missing",
    ],
  ] as const)(
    "should report the missing half when a collection specimen names %s of the curator",
    (_case, curator, blocker) => {
      expect(
        samplePublishBlockers({
          ...base,
          scientificContext: {
            provenanceStatus: "collection_specimen",
            collectionOrigin: "scientific_expedition",
            ...curator,
          },
        }),
      ).toEqual([blocker]);
    },
  );

  it.each([
    [
      "the firstname alone",
      { collectorFirstname: "Jacques" },
      "collector_lastname_missing",
    ],
    [
      "the lastname alone",
      { collectorLastname: "Cousteau" },
      "collector_firstname_missing",
    ],
  ] as const)(
    "should report the missing half when a collection specimen names %s of the collector",
    (_case, collector, blocker) => {
      expect(
        samplePublishBlockers({
          ...base,
          scientificContext: {
            provenanceStatus: "collection_specimen",
            collectionCuratorFirstname: "Georges",
            collectionCuratorLastname: "Cuvier",
            collectionOrigin: "scientific_expedition",
            ...collector,
          },
        }),
      ).toEqual([blocker]);
    },
  );

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
      "synthetic_final_product_missing",
      "synthetic_synthesis_date_missing",
      "synthetic_operator_firstname_missing",
      "synthetic_operator_lastname_missing",
    ]);
  });

  it.each([
    [
      "the firstname alone",
      { operatorFirstname: "Marie" },
      "synthetic_operator_lastname_missing",
    ],
    [
      "the lastname alone",
      { operatorLastname: "Curie" },
      "synthetic_operator_firstname_missing",
    ],
  ] as const)(
    "should report the missing half when the synthesis names %s of the operator",
    (_case, operator, blocker) => {
      expect(
        samplePublishBlockers({
          ...synthetic,
          syntheticDetails: {
            ...syntheticDetails,
            operatorFirstname: null,
            operatorLastname: null,
            ...operator,
          },
        }),
      ).toEqual([blocker]);
    },
  );

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

  const relation = (
    targetResourceType: SampleRelation["targetResourceType"],
  ): SampleRelation => ({
    id: "00000000-0000-7000-8000-000000000002",
    relationType: "references",
    identifierType: "doi",
    identifier: "https://doi.org/10.1234/x",
    targetTitle: "Referenced paper",
    targetResourceType,
    relationTypeInformation: null,
    relatedMetadataScheme: null,
    schemeURI: null,
    schemeType: null,
    description: null,
  });

  it("should report relation_resource_type_missing when a relation has no resource type", () => {
    expect(
      samplePublishBlockers({ ...base, relations: [relation(null)] }),
    ).toEqual(["relation_resource_type_missing"]);
  });

  it("should not report relation_resource_type_missing once every relation has one", () => {
    expect(
      samplePublishBlockers({ ...base, relations: [relation("dataset")] }),
    ).toEqual([]);
  });

  const DATED = {
    precision: "day",
    start: "2026-01-02",
    end: "2026-01-02",
  } as const;

  const processStep = (date: SampleProcessStep["date"]): SampleProcessStep => ({
    kind: "preparation",
    date,
    description: null,
  });

  it("should report process_step_date_missing when a process step carries no date", () => {
    expect(
      samplePublishBlockers({
        ...base,
        processSteps: [processStep(DATED), processStep(null)],
      }),
    ).toEqual(["process_step_date_missing"]);
  });

  it("should not report process_step_date_missing when every process step is dated", () => {
    expect(
      samplePublishBlockers({
        ...base,
        processSteps: [processStep(DATED), processStep(DATED)],
      }),
    ).toEqual([]);
  });

  it("should report parent_not_found when a requested parent did not resolve", () => {
    expect(samplePublishBlockers({ ...base, parents: [null] })).toEqual([
      "parent_not_found",
    ]);
    expect(
      samplePublishBlockers({ ...base, parents: [{ id: base.id }] }),
    ).toEqual([]);
  });

  const attachment = (
    overrides: Partial<SampleAttachment> = {},
  ): SampleAttachment => ({
    id: "00000000-0000-7000-8000-000000000003",
    name: "sample.pdf",
    mediaType: "application/pdf",
    title: "Field notes",
    targetResourceType: "text",
    description: "A scan of the outcrop",
    ...overrides,
  });

  it.each([
    { targetResourceType: null },
    { title: null },
    { description: null },
  ])(
    "should report attachment_metadata_missing for an attachment with %o",
    (overrides) => {
      expect(
        samplePublishBlockers({
          ...base,
          attachments: [attachment(overrides)],
        }),
      ).toEqual(["attachment_metadata_missing"]);
    },
  );

  it("should report attachment_limit_exceeded above the default limit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        attachments: Array(6).fill(attachment()),
      }),
    ).toEqual(["attachment_limit_exceeded"]);
  });

  it("should report no blocker at the default limit", () => {
    expect(
      samplePublishBlockers({
        ...base,
        attachments: Array(5).fill(attachment()),
      }),
    ).toEqual([]);
  });

  it("should honour an explicit upload limit", () => {
    expect(
      samplePublishBlockers(
        { ...base, attachments: Array(4).fill(attachment()) },
        3,
      ),
    ).toEqual(["attachment_limit_exceeded"]);
    expect(
      samplePublishBlockers(
        { ...base, attachments: Array(3).fill(attachment()) },
        3,
      ),
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

  it.each([
    [
      "a field sample's collector and chief scientist",
      {
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorUserId: LINKED_USER_ID,
          chiefScientistUserId: LINKED_USER_ID,
        },
      },
    ],
    [
      "a collection specimen's curator and collector",
      {
        ...base,
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionCuratorUserId: LINKED_USER_ID,
          collectorUserId: LINKED_USER_ID,
          collectionOrigin: "purchase",
        },
      },
    ],
    [
      "a field sample's collector whose account resolves to a partial person",
      {
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorUserId: LINKED_USER_ID,
          collectorFirstname: "Marie",
        },
      },
    ],
    [
      "a synthesis operator",
      {
        ...synthetic,
        syntheticDetails: {
          ...syntheticDetails,
          operatorFirstname: null,
          operatorLastname: null,
          operatorUserId: LINKED_USER_ID,
        },
      },
    ],
  ] as [string, Sample][])(
    "should report no name blocker when %s is linked to a registry account",
    (_case, sample) => {
      expect(samplePublishBlockers(sample)).toEqual([]);
    },
  );
});

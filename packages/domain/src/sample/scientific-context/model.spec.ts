import { describe, expect, it } from "vitest";

import {
  createScientificContextSchema,
  scientificContextSchema,
} from "./model.ts";

const fieldSample = {
  provenanceStatus: "field_sample",
  funderOrganizations: ["02feahw73", "04kdfz702"],
  researchProgramName: "Deep Biosphere Survey",
  chiefScientistFirstname: "Marie",
  chiefScientistLastname: "Curie",
  chiefScientistOrcid: "0000-0002-1825-0097",
  collectorFirstname: "Pierre",
  collectorLastname: "Curie",
  collectorOrcid: "0000-0001-2345-6789",
  hostInstitution: ["04kdfz702", "02feahw73"],
  researchCampaign: "MD 209 / 2021",
  funding: "ANR grant 42",
  researchProgramDescription: "Multi-year survey of\nsub-seafloor life",
  fieldName: "Site A",
  missionDescription: "Coring campaign in\nthe North Atlantic",
};

const collectionSpecimen = {
  provenanceStatus: "collection_specimen",
  collectionCuratorFirstname: "Georges",
  collectionCuratorLastname: "Cuvier",
  collectionOrigin: "scientific_expedition",
  collectorFirstname: "Alexander",
  collectorLastname: "von Humboldt",
  collectionContextDescription: "Assembled during the\n1799 expedition",
};

describe("scientificContextSchema", () => {
  it("should accept a full field-sample context", () => {
    expect(scientificContextSchema.parse(fieldSample)).toEqual(fieldSample);
  });

  it("should accept a full collection-specimen context", () => {
    expect(scientificContextSchema.parse(collectionSpecimen)).toEqual(
      collectionSpecimen,
    );
  });

  it.each([
    { provenanceStatus: "field_sample" },
    { provenanceStatus: "collection_specimen" },
  ])("should accept only the provenance status: %o", (input) => {
    expect(scientificContextSchema.safeParse(input).success).toBe(true);
  });

  it("should trim free-text fields", () => {
    expect(
      scientificContextSchema.parse({
        provenanceStatus: "field_sample",
        researchProgramName: "  Deep Biosphere Survey  ",
      }),
    ).toEqual({
      provenanceStatus: "field_sample",
      researchProgramName: "Deep Biosphere Survey",
    });
  });

  it.each([
    { case: "missing provenance status", input: { collectorLastname: "X" } },
    {
      case: "invalid ROR funder",
      input: {
        provenanceStatus: "field_sample",
        funderOrganizations: ["nope"],
      },
    },
    {
      case: "duplicate funder organizations",
      input: {
        provenanceStatus: "field_sample",
        funderOrganizations: ["02feahw73", "02feahw73"],
      },
    },
    {
      case: "empty host institutions (not filled is null, never [])",
      input: {
        provenanceStatus: "field_sample",
        hostInstitution: [],
      },
    },
    {
      case: "duplicate host institutions",
      input: {
        provenanceStatus: "field_sample",
        hostInstitution: ["04kdfz702", "04kdfz702"],
      },
    },
    {
      case: "malformed chief scientist ORCID",
      input: {
        provenanceStatus: "field_sample",
        chiefScientistOrcid: "0000-0002-1825",
      },
    },
    {
      case: "unknown collection origin",
      input: {
        provenanceStatus: "collection_specimen",
        collectionOrigin: "stolen",
      },
    },
  ])("should reject $case", ({ input }) => {
    expect(scientificContextSchema.safeParse(input).success).toBe(false);
  });
});

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

describe("a person is a link or a typed name, never both", () => {
  it.each([
    {
      case: "a person linked and named",
      input: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        chiefScientistFirstname: "Marie",
      },
    },
    {
      case: "a person linked and carrying an ORCID alone",
      input: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        chiefScientistOrcid: "0000-0002-1825-0097",
      },
    },
  ])("should reject $case", ({ input }) => {
    expect(createScientificContextSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    {
      case: "a field sample linking its chief scientist and its collector",
      input: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        collectorUserId: USER_ID,
      },
    },
    {
      case: "a collection specimen linking its curator and its collector",
      input: {
        provenanceStatus: "collection_specimen",
        collectionCuratorUserId: USER_ID,
        collectorUserId: USER_ID,
      },
    },
  ])("should accept $case", ({ input }) => {
    expect(createScientificContextSchema.parse(input)).toEqual(input);
  });
});

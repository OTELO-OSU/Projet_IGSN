import { describe, expect, it } from "vitest";

import { scientificContextSchema } from "./model.ts";

const fieldSample = {
  provenanceStatus: "field_sample",
  funderOrganizations: ["02feahw73", "04kdfz702"],
  researchProgramName: "Deep Biosphere Survey",
  chiefScientist: "Marie Curie",
  chiefScientistOrcid: "0000-0002-1825-0097",
  collectorName: "Pierre Curie",
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
  collectionCurator: "Georges Cuvier",
  collectionOrigin: "scientific_expedition",
  collectorName: "Alexander von Humboldt",
  collectionContextDescription: "Assembled during the\n1799 expedition",
};

describe("scientificContextSchema", () => {
  it("should accept a full recent-collection context", () => {
    expect(scientificContextSchema.parse(fieldSample)).toEqual(
      fieldSample,
    );
  });

  it("should accept a full historical-specimen context", () => {
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
    { case: "missing provenance status", input: { collectorName: "X" } },
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

import { describe, expect, it } from "vitest";

import { scientificContextSchema } from "./model.ts";

const recentCollection = {
  provenanceStatus: "recent_collection",
  funderOrganization: "02feahw73",
  researchProgramName: "Deep Biosphere Survey",
  researchProgramChief: "Marie Curie",
  researchProgramChiefOrcid: "0000-0002-1825-0097",
  collectorName: "Pierre Curie",
  collectorOrcid: "0000-0001-2345-6789",
  researchStructure: ["04kdfz702", "02feahw73"],
  researchCampaign: "MD 209 / 2021",
  funding: "ANR grant 42",
  researchProgramDescription: "Multi-year survey of\nsub-seafloor life",
  fieldName: "Site A",
  missionDescription: "Coring campaign in\nthe North Atlantic",
};

const historicalSpecimen = {
  provenanceStatus: "historical_specimen",
  collectionCurator: "Georges Cuvier",
  collectionOrigin: "scientific_expedition",
  collectorName: "Alexander von Humboldt",
  collectionContextDescription: "Assembled during the\n1799 expedition",
};

describe("scientificContextSchema", () => {
  it("should accept a full recent-collection context", () => {
    expect(scientificContextSchema.parse(recentCollection)).toEqual(
      recentCollection,
    );
  });

  it("should accept a full historical-specimen context", () => {
    expect(scientificContextSchema.parse(historicalSpecimen)).toEqual(
      historicalSpecimen,
    );
  });

  it.each([
    { provenanceStatus: "recent_collection" },
    { provenanceStatus: "historical_specimen" },
  ])("should accept only the provenance status: %o", (input) => {
    expect(scientificContextSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    { case: "missing provenance status", input: { collectorName: "X" } },
    { case: "unknown provenance status", input: { provenanceStatus: "other" } },
    {
      case: "empty free text",
      input: { provenanceStatus: "recent_collection", researchProgramName: "" },
    },
    {
      case: "invalid ROR funder",
      input: {
        provenanceStatus: "recent_collection",
        funderOrganization: "nope",
      },
    },
    {
      case: "invalid ROR in the research structures",
      input: {
        provenanceStatus: "recent_collection",
        researchStructure: ["04kdfz702", "123"],
      },
    },
    {
      case: "empty research structures (not filled is null, never [])",
      input: {
        provenanceStatus: "recent_collection",
        researchStructure: [],
      },
    },
    {
      case: "duplicate research structures",
      input: {
        provenanceStatus: "recent_collection",
        researchStructure: ["04kdfz702", "04kdfz702"],
      },
    },
    {
      case: "malformed research programme chief ORCID",
      input: {
        provenanceStatus: "recent_collection",
        researchProgramChiefOrcid: "0000-0002-1825",
      },
    },
    {
      case: "malformed collector ORCID",
      input: {
        provenanceStatus: "recent_collection",
        collectorOrcid: "not-an-orcid",
      },
    },
    {
      case: "unknown collection origin",
      input: {
        provenanceStatus: "historical_specimen",
        collectionOrigin: "stolen",
      },
    },
  ])("should reject $case", ({ input }) => {
    expect(scientificContextSchema.safeParse(input).success).toBe(false);
  });
});

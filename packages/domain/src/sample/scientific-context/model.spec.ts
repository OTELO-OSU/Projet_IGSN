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
  funding: "ANR grant 42",
  researchProgramDescription: "Multi-year survey of\nsub-seafloor life",
  platformType: "ship",
  launchPlatformName: "RV Marion Dufresne",
  additionalRoles: [],
};

const collectionSpecimen = {
  provenanceStatus: "collection_specimen",
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

  it("should accept several additional roles sharing one role on a field sample", () => {
    const additionalRoles = [
      { role: "researcher", personLastname: "Curie" },
      { role: "researcher", personLastname: "Lehmann" },
    ];

    expect(
      scientificContextSchema.parse({
        provenanceStatus: "field_sample",
        additionalRoles,
      }),
    ).toEqual({ provenanceStatus: "field_sample", additionalRoles });
  });

  it("should keep a collection specimen free of additional roles", () => {
    expect(
      scientificContextSchema.parse({
        provenanceStatus: "collection_specimen",
        additionalRoles: [{ role: "researcher", personLastname: "Curie" }],
      }),
    ).toEqual({ provenanceStatus: "collection_specimen" });
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
      additionalRoles: [],
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
      parsed: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        collectorUserId: USER_ID,
        additionalRoles: [],
      },
    },
    {
      case: "a collection specimen linking its collector",
      input: {
        provenanceStatus: "collection_specimen",
        collectorUserId: USER_ID,
      },
      parsed: {
        provenanceStatus: "collection_specimen",
        collectorUserId: USER_ID,
      },
    },
  ])("should accept $case", ({ input, parsed }) => {
    expect(createScientificContextSchema.parse(input)).toEqual(parsed);
  });

  it("should reject an additional role both linked and named, reporting the row", () => {
    const result = createScientificContextSchema.safeParse({
      provenanceStatus: "field_sample",
      additionalRoles: [
        { role: "researcher", personUserId: USER_ID, personLastname: "Curie" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "additionalRoles",
      0,
      "personUserId",
    ]);
  });
});

describe("a write payload carries no ORCID", () => {
  it("should drop every submitted ORCID rather than reject it, since an ORCID comes from the linked account alone", () => {
    expect(
      createScientificContextSchema.parse({
        provenanceStatus: "field_sample",
        chiefScientistLastname: "Curie",
        chiefScientistOrcid: "0000-0002-1825-0097",
        collectorLastname: "Lehmann",
        collectorOrcid: "0000-0001-5109-3700",
        additionalRoles: [
          {
            role: "researcher",
            personLastname: "Lovelace",
            personOrcid: "0000-0003-1415-9269",
          },
        ],
      }),
    ).toEqual({
      provenanceStatus: "field_sample",
      chiefScientistLastname: "Curie",
      collectorLastname: "Lehmann",
      additionalRoles: [{ role: "researcher", personLastname: "Lovelace" }],
    });
  });
});

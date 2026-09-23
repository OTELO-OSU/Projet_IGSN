import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import {
  CORE_RECORD_FIXTURES,
  FIELD_SAMPLE_RECORD,
  ORGANIZATION_NAME,
  SYNTHETIC_SAMPLE_RECORD,
} from "./core-record-fixture.ts";
import { FIELD_SAMPLE, toCreateSample } from "./core-sample-fixture.ts";
import { coreSampleBodySchema } from "./core-sample-schema.ts";
import { fromCoreSample } from "./from-core-sample.ts";

const reversed = (sample: Sample) => {
  const { parentIds: _parentIds, ...create } = toCreateSample(sample);
  return {
    sample: create,
    parents: sample.parents.map((parent, index) => ({
      igsn: parent.igsn,
      relationIndex: sample.relations.length + index,
    })),
  };
};

describe("fromCoreSample", () => {
  it.each(CORE_RECORD_FIXTURES)(
    "should reverse the Core record of $name",
    ({ record, sample }) => {
      expect(fromCoreSample(record)).toEqual(reversed(sample));
    },
  );

  it("should reverse a body carrying none of the server owned blocks", () => {
    const {
      record: _record,
      publication: _publication,
      rightsAndAccess: _rightsAndAccess,
      identification: {
        sampleIdentifier: _sampleIdentifier,
        landingPage: _landingPage,
        ...identification
      },
      ...body
    } = FIELD_SAMPLE_RECORD;

    expect(
      fromCoreSample(coreSampleBodySchema.parse({ ...body, identification })),
    ).toEqual(reversed(FIELD_SAMPLE));
  });

  it("should ignore the doi a body carries", () => {
    const body = coreSampleBodySchema.parse({
      ...FIELD_SAMPLE_RECORD,
      identification: {
        ...FIELD_SAMPLE_RECORD.identification,
        doi: "10.5072/OTHER",
      },
    });

    expect(fromCoreSample(body)).toEqual(reversed(FIELD_SAMPLE));
  });

  it("should ignore the ORCID a body carries for a person", () => {
    const body = coreSampleBodySchema.parse({
      ...FIELD_SAMPLE_RECORD,
      responsibility: FIELD_SAMPLE_RECORD.responsibility.map((agentRole) =>
        agentRole.agent.agentType === "Person"
          ? {
              ...agentRole,
              agent: {
                ...agentRole.agent,
                id: "https://orcid.org/0000-0002-1825-0097",
              },
            }
          : agentRole,
      ),
    });

    expect(fromCoreSample(body)).toEqual(reversed(FIELD_SAMPLE));
  });

  it.each([
    ["0123456789ABCDEFGHJKMNPQRS", "DOI"],
    ["CNRS1234567890", "IGSN"],
  ])(
    "should read the parent %s carried as a %s identifier",
    (value, identifierType) => {
      const body: CoreSampleBody = {
        ...FIELD_SAMPLE_RECORD,
        relations: [
          {
            relationType: "IsDerivedFrom",
            targetIdentifier: { value, identifierType },
            targetTitles: [{ value: "Parent core", titleType: "Main" }],
            targetResourceType: "PhysicalObject",
          },
        ],
      };

      expect(fromCoreSample(body).parents).toEqual([
        { igsn: value, relationIndex: 0 },
      ]);
    },
  );

  it("should read the archive contact first and last names as sent", () => {
    const body: CoreSampleBody = {
      ...FIELD_SAMPLE_RECORD,
      curation: {
        ...FIELD_SAMPLE_RECORD.curation,
        currentRepository: {
          organization: {
            id: "https://ror.org/02feahw73",
            name: ORGANIZATION_NAME,
          },
          collectionName: "Lorraine granites",
          contactFirstName: "Jean Pierre",
          contactLastName: "Curie",
        },
      },
    };

    expect(fromCoreSample(body).sample.repository).toEqual({
      currentArchive: "02feahw73",
      currentArchiveContactFirstname: "Jean Pierre",
      currentArchiveContactLastname: "Curie",
      collectionName: "Lorraine granites",
      originalArchive: "Ecole des Mines collection",
      originalArchiveContactFirstname: "Henri",
      originalArchiveContactLastname: "Becquerel",
    });
  });
});

describe("the synthesis operator of a Core body", () => {
  it("should credit a Researcher agent as an additional role, not as the operator", () => {
    const body: CoreSampleBody = {
      ...SYNTHETIC_SAMPLE_RECORD,
      responsibility: [
        {
          agent: {
            firstname: "Emmy",
            lastname: "Noether",
            agentType: "Person",
          },
          roles: ["Researcher"],
        },
      ],
      extensions: { experiment: { startingMaterial: "synthetic" } },
    };

    const { sample } = fromCoreSample(body);

    expect(sample.scientificContext).toMatchObject({
      additionalRoles: [
        {
          role: "researcher",
          personFirstname: "Emmy",
          personLastname: "Noether",
        },
      ],
    });
    expect(sample.syntheticDetails).toMatchObject({
      operatorFirstname: null,
      operatorLastname: null,
      researchStructure: null,
    });
  });

  it.each([
    [
      "its research structures",
      {
        firstname: "Rosalind",
        lastname: "Franklin",
        affiliations: [
          { id: "https://ror.org/02feahw73", name: ORGANIZATION_NAME },
        ],
      },
      { researchStructure: ["02feahw73"] },
    ],
    [
      "its name alone",
      { firstname: "Rosalind", lastname: "Franklin" },
      { researchStructure: null },
    ],
  ])(
    "should read the operator the experiment extension carries with %s",
    (_case, operator, expected) => {
      const body: CoreSampleBody = {
        ...SYNTHETIC_SAMPLE_RECORD,
        responsibility: [],
        production: {
          ...SYNTHETIC_SAMPLE_RECORD.production,
          processSteps: undefined,
        },
        extensions: { experiment: { operator } },
      };

      expect(fromCoreSample(body).sample.syntheticDetails).toMatchObject({
        operatorFirstname: "Rosalind",
        operatorLastname: "Franklin",
        ...expected,
      });
    },
  );
});

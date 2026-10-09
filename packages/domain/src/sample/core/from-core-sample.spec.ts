import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import {
  CORE_RECORD_FIXTURES,
  RESEARCH_PROJECT_SAMPLE_RECORD,
  ORGANIZATION_NAME,
  SYNTHETIC_SAMPLE_RECORD,
} from "./core-record-fixture.ts";
import {
  RESEARCH_PROJECT_SAMPLE,
  toCreateSample,
} from "./core-sample-fixture.ts";
import { coreSampleBodySchema } from "./core-sample-schema.ts";
import { fromCoreSample } from "./from-core-sample.ts";

const reversed = (sample: Sample) => {
  const { parentIds: _parentIds, ...create } = toCreateSample(sample);
  return {
    sample: { ...create, localIdDescription: null },
    parents: sample.parents.map((parent, index) => ({
      igsn: parent.igsn,
      relationIndex: sample.relations.length + index,
    })),
    children: sample.children.map((child, index) => ({
      igsn: child.igsn,
      relationIndex: sample.relations.length + sample.parents.length + index,
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
    } = RESEARCH_PROJECT_SAMPLE_RECORD;

    expect(
      fromCoreSample(coreSampleBodySchema.parse({ ...body, identification })),
    ).toEqual(reversed(RESEARCH_PROJECT_SAMPLE));
  });

  it("should tell the sample name from the local id by title type whatever their order", () => {
    const body = coreSampleBodySchema.parse({
      ...RESEARCH_PROJECT_SAMPLE_RECORD,
      identification: {
        ...RESEARCH_PROJECT_SAMPLE_RECORD.identification,
        titles: [
          { value: "NCY-2024-017", titleType: "Other" },
          { value: "Granite outcrop block", titleType: "Main" },
        ],
      },
    });

    expect(fromCoreSample(body).sample).toMatchObject({
      name: "Granite outcrop block",
      localId: "NCY-2024-017",
    });
  });

  it("should ignore the doi a body carries", () => {
    const body = coreSampleBodySchema.parse({
      ...RESEARCH_PROJECT_SAMPLE_RECORD,
      identification: {
        ...RESEARCH_PROJECT_SAMPLE_RECORD.identification,
        doi: "10.5072/OTHER",
      },
    });

    expect(fromCoreSample(body)).toEqual(reversed(RESEARCH_PROJECT_SAMPLE));
  });

  it("should ignore the ORCID a body carries for a person", () => {
    const body = coreSampleBodySchema.parse({
      ...RESEARCH_PROJECT_SAMPLE_RECORD,
      responsibility: RESEARCH_PROJECT_SAMPLE_RECORD.responsibility.map(
        (agentRole) =>
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

    expect(fromCoreSample(body)).toEqual(reversed(RESEARCH_PROJECT_SAMPLE));
  });

  it.each([
    ["0123456789ABCDEFGHJKMNPQRS", "DOI"],
    ["CNRS1234567890", "IGSN"],
  ])(
    "should read the parent %s carried as a %s identifier",
    (value, identifierType) => {
      const body: CoreSampleBody = {
        ...RESEARCH_PROJECT_SAMPLE_RECORD,
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

  it.each([
    ["projects.0.name", "program", { name: "MD-218" }, {}],
    ["projects.0.campaign", "campaign", { campaign: "MD-218" }, {}],
    ["samplingSite_name", "field", {}, { samplingSite_name: "MD-218" }],
    ["samplingPurpose", "mission", {}, { samplingPurpose: "MD-218" }],
  ] as const)(
    "should read a name in %s as a %s program",
    (_slot, researchProgramKind, projectSlot, productionSlot) => {
      const { production } = RESEARCH_PROJECT_SAMPLE_RECORD;
      const { name: _name, ...project } = production.projects?.[0] ?? {};
      const body: CoreSampleBody = {
        ...RESEARCH_PROJECT_SAMPLE_RECORD,
        production: {
          ...production,
          ...productionSlot,
          projects: [{ ...project, ...projectSlot }],
        },
      };

      expect(fromCoreSample(body).sample.scientificContext).toMatchObject({
        researchProgramName: "MD-218",
        researchProgramKind,
      });
    },
  );

  it("should read the archive contact first and last names as sent", () => {
    const body: CoreSampleBody = {
      ...RESEARCH_PROJECT_SAMPLE_RECORD,
      curation: {
        ...RESEARCH_PROJECT_SAMPLE_RECORD.curation,
        currentRepository: {
          organizations: [
            { id: "urn:otelo:osu:OASU", name: "OASU (OASU)" },
            { id: "urn:otelo:laboratory:UMR5805", name: "EPOC" },
          ],
          collectionName: "Lorraine granites",
          contactFirstName: "Jean Pierre",
          contactLastName: "Curie",
        },
      },
    };

    expect(fromCoreSample(body).sample.repository).toEqual({
      currentArchiveOsu: "OASU",
      currentArchiveLaboratory: "UMR5805",
      currentArchiveContactFirstname: "Jean Pierre",
      currentArchiveContactLastname: "Curie",
      collectionName: "Lorraine granites",
      rightsHolder: ["03fd77x13", "02cte4b68"],
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

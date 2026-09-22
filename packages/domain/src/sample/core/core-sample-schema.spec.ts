import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import { toConcept } from "./concept.ts";
import { FRONTEND_URL } from "./core-record-fixture.ts";
import { COLLECTION_SPECIMEN, FIELD_SAMPLE } from "./core-sample-fixture.ts";
import {
  coreSampleBodySchema,
  coreSampleSchema,
} from "./core-sample-schema.ts";
import { CORE_SAMPLE_FIXTURES } from "./core-sample-variant-fixture.ts";
import { toCoreSample } from "./to-core-sample.ts";

const core = toCoreSample(FIELD_SAMPLE, FRONTEND_URL);
const area = toCoreSample(COLLECTION_SPECIMEN, FRONTEND_URL);

const parses = (value: unknown) => coreSampleSchema.safeParse(value).success;

const IGSNS = [
  "ABCDEFGHJKMNPQRSTVWXYZ0123",
  "BCDEFGHJKMNPQRSTVWXYZ01234",
  "CDEFGHJKMNPQRSTVWXYZ012345",
];

const derivedFrom = (count: number) => ({
  ...core,
  relations: IGSNS.slice(0, count).map((igsn) => ({
    relationType: "IsDerivedFrom",
    targetIdentifier: { value: igsn, identifierType: "DOI" },
    targetTitles: [{ value: "Parent block", titleType: "Main" }],
    targetResourceType: "PhysicalObject",
  })),
});

describe("coreSampleSchema", () => {
  it.each(CORE_SAMPLE_FIXTURES)(
    "should parse the Core form of $name",
    (sample) => {
      expect(
        coreSampleSchema.safeParse(toCoreSample(sample, FRONTEND_URL)),
      ).toMatchObject({ success: true });
    },
  );

  it("should parse a sample derived from two parents", () => {
    expect(parses(derivedFrom(2))).toBe(true);
  });

  it("should reject a sample derived from three parents", () => {
    expect(parses(derivedFrom(3))).toBe(false);
  });

  const MAIN_TITLE = { value: "Granite outcrop block", titleType: "Main" };
  const LOCAL_ID_TITLE = { value: "NCY-2024-017", titleType: "Other" };

  it.each<[string, unknown[]]>([
    [
      "two main titles",
      [MAIN_TITLE, { value: "Other main title", titleType: "Main" }],
    ],
    ["no main title", [LOCAL_ID_TITLE]],
    [
      "a title type the local id mapping does not use",
      [MAIN_TITLE, { value: "Bloc de granite", titleType: "TranslatedTitle" }],
    ],
    [
      "a second title holding a local id",
      [
        MAIN_TITLE,
        LOCAL_ID_TITLE,
        { value: "NCY-2024-018", titleType: "AlternativeTitle" },
      ],
    ],
  ])("should reject titles with %s", (_case, titles) => {
    expect(
      parses({ ...core, identification: { ...core.identification, titles } }),
    ).toBe(false);
  });

  it("should reject a concept id the scheme does not carry", () => {
    expect(
      parses({
        ...core,
        classification: {
          ...core.classification,
          natureOfSample: toConcept("nature-of-sample", "not_a_nature"),
        },
      }),
    ).toBe(false);
  });

  it("should reject a polygon ring that is not a closed rectangle", () => {
    expect(
      parses({
        ...area,
        production: {
          ...area.production,
          location: {
            ...area.production.location,
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-20, 30],
                  [-10, 30],
                  [-12, 40],
                  [-20, 40],
                  [-20, 30],
                ],
              ],
            },
          },
        },
      }),
    ).toBe(false);
  });

  it("should reject a role outside the mapped ones", () => {
    expect(
      parses({
        ...core,
        responsibility: [
          {
            agent: { name: "Ada Lovelace", agentType: "Person" },
            roles: ["ProjectLeader"],
          },
        ],
      }),
    ).toBe(false);
  });

  it("should reject contextCategories without the material path", () => {
    expect(
      parses({
        ...core,
        classification: {
          ...core.classification,
          contextCategories: core.classification.contextCategories.filter(
            (concept) => concept.schemeName !== "otelo:material",
          ),
        },
      }),
    ).toBe(false);
  });

  it("should reject a material context path outside the head material", () => {
    expect(
      parses({
        ...core,
        classification: {
          ...core.classification,
          materialCategories: [
            toConcept("material", "rock_and_sediment.sediment"),
          ],
        },
      }),
    ).toBe(false);
  });

  it("should reject a key the pivot does not carry", () => {
    expect(parses({ ...core, keywords: [] })).toBe(false);
  });
});

describe("coreSampleBodySchema", () => {
  it("should accept a body without the server owned blocks", () => {
    const {
      record: _record,
      publication: _publication,
      rightsAndAccess: _rightsAndAccess,
      identification,
      ...body
    } = core;
    const {
      sampleIdentifier: _sampleIdentifier,
      landingPage: _landingPage,
      ...bodyIdentification
    } = identification;

    expect(
      coreSampleBodySchema.safeParse({
        ...body,
        identification: bodyIdentification,
        responsibility: [],
      }),
    ).toMatchObject({ success: true });
  });
});

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

const linked = (sample: Sample): Sample => ({
  ...sample,
  scientificContext:
    sample.scientificContext?.provenanceStatus === "field_sample"
      ? {
          ...sample.scientificContext,
          collectorUserId: USER_ID,
          chiefScientistUserId: USER_ID,
          additionalRoles: sample.scientificContext.additionalRoles.map(
            (additional) => ({ ...additional, personUserId: USER_ID }),
          ),
        }
      : sample.scientificContext,
  syntheticDetails:
    sample.syntheticDetails == null
      ? null
      : { ...sample.syntheticDetails, operatorUserId: USER_ID },
});

const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...keysOf(nested),
  ]);
};

describe("the account links a Core record never carries", () => {
  it.each(CORE_SAMPLE_FIXTURES)(
    "should emit no account link of $name",
    (sample) => {
      expect(
        keysOf(toCoreSample(linked(sample), FRONTEND_URL)).filter((key) =>
          key.toLowerCase().includes("userid"),
        ),
      ).toEqual([]);
    },
  );

  it.each([
    [
      "an agent",
      {
        responsibility: [
          {
            agent: {
              agentType: "Person",
              firstname: "Ada",
              lastname: "Lovelace",
              userId: USER_ID,
            },
            roles: ["Researcher"],
          },
        ],
      },
    ],
    [
      "the synthesis operator",
      {
        extensions: {
          experiment: {
            operator: {
              firstname: "Ada",
              lastname: "Lovelace",
              userId: USER_ID,
            },
          },
        },
      },
    ],
  ])("should refuse a body linking %s to an account", (_case, block) => {
    expect(coreSampleBodySchema.safeParse({ ...core, ...block })).toMatchObject(
      {
        success: false,
      },
    );
  });
});

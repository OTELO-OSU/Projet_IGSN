import { describe, expect, it } from "vitest";

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

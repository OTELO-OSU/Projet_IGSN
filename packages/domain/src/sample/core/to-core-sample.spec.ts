import { describe, expect, it } from "vitest";

import { FRONTEND_URL } from "./core-record-fixture.ts";
import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  SYNTHETIC_SAMPLE,
} from "./core-sample-fixture.ts";
import { SYNTHETIC_SUB_SAMPLE } from "./core-sample-variant-fixture.ts";
import { toCoreSample } from "./to-core-sample.ts";

describe("toCoreSample", () => {
  it("should record the creation, publication and edition as lifecycle events", () => {
    expect(
      toCoreSample(FIELD_SAMPLE, FRONTEND_URL).record.lifecycleEvents,
    ).toEqual([
      { eventType: "created", timestamp: "2024-06-02T10:00:00.000Z" },
      { eventType: "published", timestamp: "2024-06-03T10:00:00.000Z" },
      { eventType: "updated", timestamp: "2024-06-04T10:00:00.000Z" },
    ]);
  });

  it("should omit the updated event when the sample was not edited after publication", () => {
    expect(
      toCoreSample(COLLECTION_SPECIMEN, FRONTEND_URL).record.lifecycleEvents,
    ).toEqual([
      { eventType: "created", timestamp: "2023-04-01T09:00:00.000Z" },
      { eventType: "published", timestamp: "2023-04-02T09:00:00.000Z" },
    ]);
  });

  it("should omit the published event when the sample has no publication date", () => {
    expect(
      toCoreSample({ ...FIELD_SAMPLE, publishedAt: null }, FRONTEND_URL).record
        .lifecycleEvents,
    ).toEqual([
      { eventType: "created", timestamp: "2024-06-02T10:00:00.000Z" },
    ]);
  });

  it("should point the landing page at the frontend", () => {
    expect(toCoreSample(FIELD_SAMPLE, FRONTEND_URL).identification).toEqual({
      sampleIdentifier: "ABCDEFGHJKMNPQRSTVWXYZ0123",
      doi: "10.5072/ABCDEFGHJKMNPQRSTVWXYZ0123",
      landingPage:
        "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
      titles: [{ value: "Granite outcrop block", titleType: "Main" }],
      localName: "Block A",
    });
  });

  it("should carry no doi when the sample has no prefix", () => {
    expect(
      toCoreSample(SYNTHETIC_SAMPLE, FRONTEND_URL).identification.doi,
    ).toBeUndefined();
  });

  it("should name OTELo as the registrant", () => {
    expect(
      toCoreSample(FIELD_SAMPLE, FRONTEND_URL).responsibility,
    ).toContainEqual({
      agent: {
        id: "https://ror.org/02cyw3861",
        name: "OTELo",
        agentType: "Organization",
      },
      roles: ["Registrant"],
    });
  });

  it("should affiliate the creator with the institutional trio", () => {
    expect(
      toCoreSample(FIELD_SAMPLE, FRONTEND_URL).responsibility,
    ).toContainEqual({
      agent: {
        firstname: "Marie",
        lastname: "Curie",
        agentType: "Person",
        affiliations: [
          {
            id: "https://ror.org/02feahw73",
            name: "Centre National de la Recherche Scientifique (CNRS)",
          },
          { id: "urn:otelo:osu:OMP", name: "Observatoire Midi-Pyrénées (OMP)" },
          {
            id: "urn:otelo:laboratory:UMR3589",
            name: "Centre National de Recherches Météorologiques (CNRM)",
          },
        ],
      },
      roles: ["Creator"],
    });
  });

  it("should draw an area as one closed rectangular ring", () => {
    expect(
      toCoreSample(COLLECTION_SPECIMEN, FRONTEND_URL).production.location
        ?.geometry,
    ).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [-20, 30],
          [-10, 30],
          [-10, 40],
          [-20, 40],
          [-20, 30],
        ],
      ],
    });
  });

  it("should give a known vertical reference system its EPSG datum", () => {
    expect(
      toCoreSample(FIELD_SAMPLE, FRONTEND_URL).production.location
        ?.verticalExtent,
    ).toEqual({
      minimum: {
        value: 120,
        unitCode: "m",
        reference: "depthBelowGround",
        verticalDatum: "EPSG:5720",
        positiveDirection: "down",
      },
    });
  });

  it("should convert a pressure in kbar to bar", () => {
    expect(
      toCoreSample(FIELD_SAMPLE, FRONTEND_URL).curation.sampleCondition
        ?.pressure,
    ).toEqual({ value: 1100, unitCode: "bar", unitLabel: "kbar" });
  });

  it("should emit the archive contact first and last names apart", () => {
    const { currentRepository } = toCoreSample(
      FIELD_SAMPLE,
      FRONTEND_URL,
    ).curation;
    expect(currentRepository).toMatchObject({
      contactFirstName: "Pierre",
      contactLastName: "Curie",
    });
  });

  it("should describe the synthesis as one process step", () => {
    expect(
      toCoreSample(SYNTHETIC_SAMPLE, FRONTEND_URL).production.processSteps,
    ).toEqual([
      {
        stepType: "Synthesis",
        description: "Piston cylinder run held at 2 GPa",
        timestampStart: "2025-01-10",
        timestampEnd: "2025-01-12",
        timestampPrecision: "day",
        method: {
          id: "fusion",
          label: "fusion",
          schemeName: "otelo:experiment-type",
          schemeURI: "urn:otelo:vocabulary:experiment-type",
        },
      },
    ]);
  });

  it("should emit the synthesis step first, then the stored process steps", () => {
    expect(
      toCoreSample(SYNTHETIC_SUB_SAMPLE, FRONTEND_URL).production.processSteps,
    ).toEqual([
      {
        stepType: "Synthesis",
        description: "Piston cylinder run held at 2 GPa",
        timestampStart: "2025-01-10",
        timestampEnd: "2025-01-12",
        timestampPrecision: "day",
        method: {
          id: "fusion",
          label: "fusion",
          schemeName: "otelo:experiment-type",
          schemeURI: "urn:otelo:vocabulary:experiment-type",
        },
      },
      {
        stepType: "Transformation",
        description: "Mounted in epoxy and polished",
        timestampStart: "2025-01-15T09:00",
        timestampEnd: "2025-01-15T11:00",
        timestampPrecision: "hour",
        timestampTimeZone: "Europe/Paris",
      },
    ]);
  });

  it.each([
    ["0123456789ABCDEFGHJKMNPQRS", "DOI"],
    ["CNRS1234567890", "IGSN"],
  ])("should carry the parent IGSN %s as a %s identifier", (igsn, type) => {
    const sample = {
      ...FIELD_SAMPLE,
      parents: [
        {
          id: "88888888-8888-4888-8888-888888888888",
          igsn,
          name: "Parent core",
          material: null,
        },
      ],
    };

    expect(toCoreSample(sample, FRONTEND_URL).relations?.at(-1)).toEqual({
      relationType: "IsDerivedFrom",
      targetIdentifier: { value: igsn, identifierType: type },
      targetURI: `${FRONTEND_URL}samples/${igsn}`,
      targetTitles: [{ value: "Parent core", titleType: "Main" }],
      targetResourceType: "PhysicalObject",
    });
  });
});

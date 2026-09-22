import { describe, expect, it } from "vitest";

import { core, corePaths } from "../core/core-paths-fixture.ts";
import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  LINE_SAMPLE,
  SYNTHETIC_SAMPLE,
} from "../core/core-sample-fixture.ts";
import { toDataCiteSample } from "./to-datacite-sample.ts";

const PROJECTED_CORE_PATHS = [
  "record.recordId",
  "record.metadataLanguage",
  "record.lifecycleEvents",
  "identification.sampleIdentifier",
  "identification.doi",
  "identification.landingPage",
  "identification.titles",
  "classification.materialCategories",
  "classification.contextCategories",
  "responsibility.agent",
  "responsibility.roles",
  "publication.publisher",
  "publication.publicationYear",
  "production.collection_date_start",
  "production.collection_date_end",
  "production.samplingPurpose",
  "production.projects",
  "production.location",
  "physicalDescription.openPhysicalDescription",
  "physicalDescription.dimensions",
  "physicalDescription.mass",
  "physicalDescription.volume",
  "relations.relationType",
  "relations.targetIdentifier",
  "relations.targetResourceType",
  "rightsAndAccess.rightsURIs",
  "rightsAndAccess.sensitiveLocation",
];

const DROPPED_CORE_PATHS = [
  "schemaVersion",
  "record.createdAt",
  "record.updatedAt",
  "record.metadataVersion",
  "identification.localName",
  "classification.natureOfSample",
  "classification.sampleObjectTypes",
  "production.collectionDatePrecision",
  "production.collectionDateTimeZone",
  "production.collectionMethod",
  "production.collectionMethodDescription",
  "production.samplingSite_name",
  "production.processSteps",
  "physicalDescription.orientation",
  "relations.targetURI",
  "relations.targetTitles",
  "relations.relationTypeInformation",
  "relations.relatedMetadataScheme",
  "relations.schemeURI",
  "relations.schemeType",
  "relations.description",
  "curation.existenceStatus",
  "curation.availabilityStatus",
  "curation.currentRepository",
  "curation.originalRepository",
  "curation.sampleCondition",
  "rightsAndAccess.metadataVisibility",
  "manualGroups.id",
  "manualGroups.name",
  "extensions.geology",
  "extensions.safety",
  "extensions.experiment",
];

const ORGANIZATION_NAME = "Centre National de la Recherche Scientifique (CNRS)";

const ORGANIZATION_AFFILIATION = {
  name: ORGANIZATION_NAME,
  affiliationIdentifier: "https://ror.org/02feahw73",
  affiliationIdentifierScheme: "ROR",
  schemeUri: "https://ror.org",
};

const PUBLISHER = {
  name: "OTELo",
  publisherIdentifier: "https://ror.org/02cyw3861",
  publisherIdentifierScheme: "ROR",
  schemeUri: "https://ror.org",
};

const RIGHTS_LIST = [
  {
    rights: "Creative Commons Attribution 4.0 International",
    rightsUri: "https://creativecommons.org/licenses/by/4.0/",
    rightsIdentifier: "CC-BY-4.0",
    rightsIdentifierScheme: "SPDX",
  },
];

const SCHEMA_VERSION = "http://datacite.org/schema/kernel-4";

describe("a Core record mapped to DataCite", () => {
  it("should project a field sample onto its DataCite record", () => {
    expect(toDataCiteSample(core(FIELD_SAMPLE))).toEqual({
      doi: "10.5072/ABCDEFGHJKMNPQRSTVWXYZ0123",
      url: "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
      titles: [{ title: "Granite outcrop block" }],
      creators: [
        {
          name: "Marie Curie",
          nameType: "Personal",
          affiliation: [
            ORGANIZATION_AFFILIATION,
            { name: "Observatoire Midi-Pyrénées (OMP)" },
            { name: "Centre National de Recherches Météorologiques (CNRM)" },
          ],
        },
      ],
      contributors: [
        {
          name: "Inge Lehmann",
          nameType: "Personal",
          nameIdentifiers: [
            {
              nameIdentifier: "https://orcid.org/0000-0001-5109-3700",
              nameIdentifierScheme: "ORCID",
              schemeUri: "https://orcid.org",
            },
          ],
          contributorType: "DataCollector",
        },
        {
          name: "Alfred Wegener",
          nameType: "Personal",
          nameIdentifiers: [
            {
              nameIdentifier: "https://orcid.org/0000-0002-1825-0097",
              nameIdentifierScheme: "ORCID",
              schemeUri: "https://orcid.org",
            },
          ],
          contributorType: "ProjectLeader",
        },
        {
          name: ORGANIZATION_NAME,
          nameType: "Organizational",
          nameIdentifiers: [
            {
              nameIdentifier: "https://ror.org/02feahw73",
              nameIdentifierScheme: "ROR",
              schemeUri: "https://ror.org",
            },
          ],
          contributorType: "HostingInstitution",
        },
      ],
      publisher: PUBLISHER,
      publicationYear: 2024,
      types: { resourceType: "rock", resourceTypeGeneral: "PhysicalObject" },
      subjects: [
        {
          subject: "granite",
          subjectScheme: "otelo:material",
          schemeUri: "urn:otelo:vocabulary:material",
        },
        {
          subject: "phaneritic",
          subjectScheme: "otelo:texture",
          schemeUri: "urn:otelo:vocabulary:texture",
        },
        {
          subject: "badlands",
          subjectScheme: "otelo:geomorphologicalContext",
          schemeUri: "urn:otelo:vocabulary:geomorphologicalContext",
        },
        {
          subject: "uranium",
          subjectScheme: "otelo:resource-type",
          schemeUri: "urn:otelo:vocabulary:resource-type",
        },
        {
          subject: "Hercynian basement",
          subjectScheme: "otelo:geologicalContext",
          schemeUri: "urn:otelo:vocabulary:geologicalContext",
        },
        {
          subject: "field_sample",
          subjectScheme: "otelo:scientificContext",
          schemeUri: "urn:otelo:vocabulary:scientificContext",
        },
      ],
      dates: [
        { date: "2024-06-02T10:00:00.000Z", dateType: "Created" },
        { date: "2024-06-03T10:00:00.000Z", dateType: "Available" },
        { date: "2024-06-04T10:00:00.000Z", dateType: "Updated" },
        { date: "2024-06-01T08:30/2024-06-01T11:00", dateType: "Collected" },
      ],
      language: "en",
      alternateIdentifiers: [
        {
          alternateIdentifier: "urn:uuid:11111111-1111-4111-8111-111111111111",
          alternateIdentifierType: "UUID",
        },
      ],
      relatedIdentifiers: [
        {
          relatedIdentifier: "https://doi.org/10.1234/granites-of-lorraine",
          relatedIdentifierType: "DOI",
          relationType: "IsCitedBy",
          resourceTypeGeneral: "JournalArticle",
        },
        {
          relatedIdentifier: "0123456789ABCDEFGHJKMNPQRS",
          relatedIdentifierType: "DOI",
          relationType: "IsDerivedFrom",
          resourceTypeGeneral: "PhysicalObject",
        },
      ],
      sizes: ["2.4 kg", "350 mL", "12 cm", "8 cm", "4 cm"],
      rightsList: RIGHTS_LIST,
      geoLocations: [
        {
          geoLocationPlace: "Nancy quarry",
          geoLocationPoint: { pointLongitude: 6.18, pointLatitude: 48.69 },
        },
      ],
      fundingReferences: [
        {
          funderName: "GEOLOR",
          funderIdentifier: "https://ror.org/02feahw73",
          funderIdentifierType: "ROR",
          awardNumber: "ANR grant 2023",
        },
      ],
      descriptions: [
        {
          description: "Sampling campaign of June 2024",
          descriptionType: "Abstract",
        },
        {
          description: "Coarse grained and slightly weathered",
          descriptionType: "Other",
        },
      ],
      schemaVersion: SCHEMA_VERSION,
    });
  });

  it("should project a synthetic sample onto its DataCite record", () => {
    expect(toDataCiteSample(core(SYNTHETIC_SAMPLE))).toEqual({
      doi: "CNRS1234567890",
      url: "https://igsn.example.org/samples/CNRS1234567890",
      titles: [{ title: "Synthetic basaltic glass" }],
      creators: [
        {
          name: "Rosalind Franklin",
          nameType: "Personal",
          affiliation: [
            ORGANIZATION_AFFILIATION,
            { name: "Centre National de Recherches Météorologiques (CNRM)" },
          ],
        },
      ],
      contributors: [
        {
          name: "Rosalind Franklin",
          nameType: "Personal",
          contributorType: "DataCollector",
        },
        {
          name: "Rosalind Franklin",
          nameType: "Personal",
          nameIdentifiers: [
            {
              nameIdentifier: "https://orcid.org/0000-0003-1415-9269",
              nameIdentifierScheme: "ORCID",
              schemeUri: "https://orcid.org",
            },
          ],
          affiliation: [ORGANIZATION_AFFILIATION],
          contributorType: "Researcher",
        },
      ],
      publisher: PUBLISHER,
      publicationYear: 2025,
      types: {
        resourceType: "synthetic_rock_mineral",
        resourceTypeGeneral: "PhysicalObject",
      },
      subjects: [
        {
          subject: "synthetic_rock_mineral",
          subjectScheme: "otelo:material",
          schemeUri: "urn:otelo:vocabulary:material",
        },
        {
          subject: "field_sample",
          subjectScheme: "otelo:scientificContext",
          schemeUri: "urn:otelo:vocabulary:scientificContext",
        },
      ],
      dates: [
        { date: "2025-01-20T08:00:00.000Z", dateType: "Created" },
        { date: "2025-01-21T08:00:00.000Z", dateType: "Available" },
        { date: "2025-01-22T08:00:00.000Z", dateType: "Updated" },
        { date: "2025-01-12", dateType: "Collected" },
      ],
      language: "en",
      alternateIdentifiers: [
        {
          alternateIdentifier: "urn:uuid:77777777-7777-4777-8777-777777777777",
          alternateIdentifierType: "UUID",
        },
      ],
      relatedIdentifiers: [],
      sizes: [],
      rightsList: RIGHTS_LIST,
      geoLocations: [],
      fundingReferences: [],
      descriptions: [],
      schemaVersion: SCHEMA_VERSION,
    });
  });
});

describe("the Collected date of a DataCite record", () => {
  it.each([
    {
      name: "a one-off collection",
      sample: SYNTHETIC_SAMPLE,
      date: "2025-01-12",
    },
    {
      name: "a collection spread over time",
      sample: FIELD_SAMPLE,
      date: "2024-06-01T08:30/2024-06-01T11:00",
    },
  ])("should carry the start alone for $name", ({ sample, date }) => {
    expect(toDataCiteSample(core(sample)).dates).toContainEqual({
      date,
      dateType: "Collected",
    });
  });
});

describe("the geolocation of a DataCite record", () => {
  it.each([
    {
      name: "a point",
      sample: FIELD_SAMPLE,
      geoLocation: {
        geoLocationPlace: "Nancy quarry",
        geoLocationPoint: { pointLongitude: 6.18, pointLatitude: 48.69 },
      },
    },
    {
      name: "an area",
      sample: COLLECTION_SPECIMEN,
      geoLocation: {
        geoLocationPlace: "Mid Atlantic ridge",
        geoLocationBox: {
          westBoundLongitude: -20,
          eastBoundLongitude: -10,
          southBoundLatitude: 30,
          northBoundLatitude: 40,
        },
      },
    },
    {
      name: "a track",
      sample: LINE_SAMPLE,
      geoLocation: {
        geoLocationPlace: "Mid Atlantic ridge",
        geoLocationBox: {
          westBoundLongitude: -20,
          eastBoundLongitude: -10,
          southBoundLatitude: 30,
          northBoundLatitude: 40,
        },
      },
    },
  ])("should carry $name collected over", ({ sample, geoLocation }) => {
    expect(toDataCiteSample(core(sample)).geoLocations).toEqual([geoLocation]);
  });

  it("should keep the west beyond the east for a track crossing the antimeridian", () => {
    expect(
      toDataCiteSample(
        core({
          ...LINE_SAMPLE,
          location: {
            ...LINE_SAMPLE.location,
            position: {
              type: "line",
              startLongitude: 170,
              startLatitude: 30,
              endLongitude: -170,
              endLatitude: 40,
            },
          },
        }),
      ).geoLocations[0]?.geoLocationBox,
    ).toEqual({
      westBoundLongitude: 170,
      eastBoundLongitude: -170,
      southBoundLatitude: 30,
      northBoundLatitude: 40,
    });
  });

  it("should carry no geolocation when the location names no place and no coordinates", () => {
    expect(
      toDataCiteSample(
        core({
          ...FIELD_SAMPLE,
          location: { region: { kind: "country", country: "FR" } },
        }),
      ).geoLocations,
    ).toEqual([]);
  });

  it("should keep the place alone when the location is sensitive", () => {
    const sensitive = core(FIELD_SAMPLE);

    expect(
      toDataCiteSample({
        ...sensitive,
        rightsAndAccess: {
          ...sensitive.rightsAndAccess,
          sensitiveLocation: true,
        },
      }).geoLocations,
    ).toEqual([{ geoLocationPlace: "Nancy quarry" }]);
  });
});

describe("the Core coverage of the DataCite mapping", () => {
  it("should hold every Core field as projected or deliberately dropped", () => {
    expect(corePaths().toSorted()).toEqual(
      [...PROJECTED_CORE_PATHS, ...DROPPED_CORE_PATHS].toSorted(),
    );
  });
});

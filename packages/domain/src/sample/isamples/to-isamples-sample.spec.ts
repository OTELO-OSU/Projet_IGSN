import { describe, expect, it } from "vitest";

import { toConcept } from "../core/concept.ts";
import { core, corePaths } from "../core/core-paths-fixture.ts";
import { ORGANIZATION_NAME } from "../core/core-record-fixture.ts";
import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  LINE_SAMPLE,
  SYNTHETIC_SAMPLE,
} from "../core/core-sample-fixture.ts";
import { MATERIAL_TREE } from "../material/classification.ts";
import { toISamplesSample } from "./to-isamples-sample.ts";

const PROJECTED_CORE_PATHS = [
  "record.recordId",
  "record.updatedAt",
  "identification.sampleIdentifier",
  "identification.landingPage",
  "identification.titles",
  "classification.materialCategories",
  "responsibility.agent",
  "responsibility.roles",
  "production.collection_date_start",
  "production.samplingPurpose",
  "production.samplingSite_name",
  "production.projects",
  "production.location",
  "physicalDescription.openPhysicalDescription",
  "relations.relationType",
  "relations.targetIdentifier",
  "relations.targetTitles",
  "relations.description",
  "curation.existenceStatus",
  "curation.availabilityStatus",
  "curation.currentRepository",
  "rightsAndAccess.rightsURIs",
  "rightsAndAccess.sensitiveLocation",
  "extensions.geology",
];

const DROPPED_CORE_PATHS = [
  "schemaVersion",
  "record.createdAt",
  "record.metadataLanguage",
  "record.metadataVersion",
  "record.lifecycleEvents",
  "identification.localName",
  "classification.natureOfSample",
  "classification.sampleObjectTypes",
  "classification.contextCategories",
  "publication.publisher",
  "publication.publicationYear",
  "production.collection_date_end",
  "production.collectionDatePrecision",
  "production.collectionDateTimeZone",
  "production.collectionMethod",
  "production.collectionMethodDescription",
  "production.processSteps",
  "physicalDescription.orientation",
  "physicalDescription.dimensions",
  "physicalDescription.mass",
  "physicalDescription.volume",
  "relations.targetURI",
  "relations.targetResourceType",
  "relations.relationTypeInformation",
  "relations.relatedMetadataScheme",
  "relations.schemeURI",
  "relations.schemeType",
  "curation.originalRepository",
  "curation.sampleCondition",
  "rightsAndAccess.metadataVisibility",
  "manualGroups.id",
  "manualGroups.name",
  "extensions.safety",
  "extensions.experiment",
];

const MATERIAL_BASE = "https://w3id.org/isample/vocabulary/material/";

const MATERIAL_SCHEME = {
  scheme_name: "iSamples Materials Vocabulary",
  scheme_uri: `${MATERIAL_BASE}1.0/materialsvocabulary`,
};

const ROCK = { label: "Rock", pid: `${MATERIAL_BASE}rock`, ...MATERIAL_SCHEME };

const PARTICULATE = {
  label: "Particulate",
  pid: `${MATERIAL_BASE}particulate`,
  ...MATERIAL_SCHEME,
};

const SAMPLED_FEATURE_BASE =
  "https://w3id.org/isample/vocabulary/sampledfeature/";

const SAMPLED_FEATURE_SCHEME = {
  scheme_name: "iSamples Sampled Feature Type vocabulary",
  scheme_uri: `${SAMPLED_FEATURE_BASE}1.0/sampledfeaturevocabulary`,
};

const EARTH_INTERIOR = {
  label: "Earth interior",
  pid: `${SAMPLED_FEATURE_BASE}earthinterior`,
  ...SAMPLED_FEATURE_SCHEME,
};

const EXTRATERRESTRIAL_ENVIRONMENT = {
  label: "Extraterrestrial environment",
  pid: `${SAMPLED_FEATURE_BASE}extraterrestrialenvironment`,
  ...SAMPLED_FEATURE_SCHEME,
};

const OBJECT_TYPE_BASE =
  "https://w3id.org/isample/vocabulary/materialsampleobjecttype/";

const SOLID_MATERIAL_SAMPLE = {
  label: "Solid material sample",
  pid: `${OBJECT_TYPE_BASE}solidmaterialsample`,
  scheme_name: "iSamples Material Sample Object Type Vocabulary",
  scheme_uri: `${OBJECT_TYPE_BASE}1.0/materialsampleobjecttype`,
};

const REGISTRANT = {
  name: "OTELo",
  pid: "https://ror.org/02cyw3861",
  role: "registrant",
};

const COMPLIES_WITH = ["https://w3id.org/isample/schema/2.0"];

const DC_RIGHTS = "https://creativecommons.org/licenses/by/4.0/";

const METEORITE_SAMPLE = {
  ...FIELD_SAMPLE,
  material: "rock_and_sediment.extraterrestrial_rock.micrometeorites",
};

describe("a Core record mapped to iSamples", () => {
  it("should project a field sample onto its iSamples record", () => {
    expect(toISamplesSample(core(FIELD_SAMPLE))).toEqual({
      pid: "ABCDEFGHJKMNPQRSTVWXYZ0123",
      sample_identifier:
        "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
      label: "Granite outcrop block",
      description: "Coarse grained and slightly weathered",
      alternate_identifiers: ["urn:uuid:11111111-1111-4111-8111-111111111111"],
      keywords: [
        {
          label: "u",
          scheme_name: "otelo:element",
          scheme_uri: "urn:otelo:vocabulary:element",
        },
      ],
      dc_rights: DC_RIGHTS,
      last_modified_time: "2024-06-04T10:00:00.000Z",
      complies_with: COMPLIES_WITH,
      has_material_category: [ROCK],
      has_sample_object_type: [SOLID_MATERIAL_SAMPLE],
      has_context_category: [EARTH_INTERIOR],
      registrant: REGISTRANT,
      sampling_purpose: "Sampling campaign of June 2024",
      produced_by: {
        label: "Quarry 12",
        description: "Sampling campaign of June 2024",
        responsibility: [
          {
            name: "Inge Lehmann",
            pid: "https://orcid.org/0000-0001-5109-3700",
            role: "collector",
          },
          {
            name: "Alfred Wegener",
            pid: "https://orcid.org/0000-0002-1825-0097",
            role: "chiefScientist",
          },
        ],
        authorized_by: ["Marie Curie"],
        result_time: "2024-06-01T08:30",
        project: "GEOLOR",
        sampling_site: {
          description: "Northern face of the quarry",
          place_name: ["Nancy quarry", "FR"],
        },
        sample_location: {
          latitude: 48.69,
          longitude: 6.18,
          elevation: "120 m depthBelowGround",
          obfuscated: false,
        },
      },
      curation: {
        label: "partiallyConsumed",
        access_constraints: ["available"],
        curation_location: `${ORGANIZATION_NAME}, Lorraine granites`,
        responsibility: [],
      },
      related_resource: [
        {
          relationship: "IsCitedBy",
          target: "https://doi.org/10.1234/granites-of-lorraine",
          label: "Granites of Lorraine",
        },
        {
          relationship: "IsDerivedFrom",
          target: "0123456789ABCDEFGHJKMNPQRS",
          label: "Parent core",
        },
      ],
    });
  });

  it("should project a synthetic sample onto its iSamples record", () => {
    expect(toISamplesSample(core(SYNTHETIC_SAMPLE))).toEqual({
      pid: "CNRS1234567890",
      sample_identifier: "https://igsn.example.org/samples/CNRS1234567890",
      label: "Synthetic basaltic glass",
      alternate_identifiers: ["urn:uuid:77777777-7777-4777-8777-777777777777"],
      keywords: [],
      dc_rights: DC_RIGHTS,
      last_modified_time: "2025-01-22T08:00:00.000Z",
      complies_with: COMPLIES_WITH,
      has_material_category: [PARTICULATE],
      has_sample_object_type: [SOLID_MATERIAL_SAMPLE],
      has_context_category: [EARTH_INTERIOR],
      registrant: REGISTRANT,
      produced_by: {
        responsibility: [
          { name: "Rosalind Franklin", role: "collector" },
          {
            name: "Rosalind Franklin",
            pid: "https://orcid.org/0000-0003-1415-9269",
            affiliation: ORGANIZATION_NAME,
            role: "researcher",
          },
        ],
        authorized_by: ["Rosalind Franklin"],
        result_time: "2025-01-12",
      },
      curation: {
        label: "exists",
        access_constraints: ["available"],
        responsibility: [],
      },
      related_resource: [],
    });
  });
});

describe("the related resources of an iSamples record", () => {
  it("should carry the description of the related resource", () => {
    const sample = core(FIELD_SAMPLE);

    expect(
      toISamplesSample({
        ...sample,
        relations: sample.relations?.map((relation) => ({
          ...relation,
          description: "Cited in the regional survey",
        })),
      }).related_resource[0],
    ).toEqual({
      relationship: "IsCitedBy",
      target: "https://doi.org/10.1234/granites-of-lorraine",
      label: "Granites of Lorraine",
      description: "Cited in the regional survey",
    });
  });
});

describe("the sample location of an iSamples record", () => {
  it.each([
    {
      name: "an area",
      sample: COLLECTION_SPECIMEN,
      sampleLocation: { elevation: "1000 m bathymetry", obfuscated: false },
    },
    {
      name: "a track",
      sample: LINE_SAMPLE,
      sampleLocation: { elevation: "1200 m bathymetry", obfuscated: false },
    },
  ])("should carry no coordinates for $name", ({ sample, sampleLocation }) => {
    expect(toISamplesSample(core(sample)).produced_by.sample_location).toEqual(
      sampleLocation,
    );
  });

  it("should withhold the coordinates and keep the place names of a sensitive location", () => {
    const sample = core(FIELD_SAMPLE);

    const producedBy = toISamplesSample({
      ...sample,
      rightsAndAccess: { ...sample.rightsAndAccess, sensitiveLocation: true },
    }).produced_by;

    expect(producedBy.sample_location).toEqual({
      elevation: "120 m depthBelowGround",
      obfuscated: true,
    });
    expect(producedBy.sampling_site).toEqual({
      description: "Northern face of the quarry",
      place_name: ["Nancy quarry", "FR"],
    });
  });
});

describe("the iSamples categories of a Core record", () => {
  it("should carry the particulate material and the extraterrestrial environment of a meteorite", () => {
    const record = toISamplesSample(core(METEORITE_SAMPLE));

    expect(record.has_material_category).toEqual([PARTICULATE]);
    expect(record.has_context_category).toEqual([EXTRATERRESTRIAL_ENVIRONMENT]);
  });

  it.each(MATERIAL_TREE.rock_and_sediment.choices ?? [])(
    "should map the head material %s onto an iSamples concept",
    (choice) => {
      const sample = core(FIELD_SAMPLE);

      const record = toISamplesSample({
        ...sample,
        classification: {
          ...sample.classification,
          materialCategories: [
            toConcept("material", `rock_and_sediment.${choice}`),
          ],
        },
      });

      expect(record.has_material_category[0]).toBeDefined();
    },
  );
});

describe("the Core coverage of the iSamples mapping", () => {
  it("should hold every Core field as projected or deliberately dropped", () => {
    expect(corePaths().toSorted()).toEqual(
      [...PROJECTED_CORE_PATHS, ...DROPPED_CORE_PATHS].toSorted(),
    );
  });
});

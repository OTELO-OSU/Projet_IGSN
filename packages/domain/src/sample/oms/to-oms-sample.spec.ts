import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import { toConcept } from "../core/concept.ts";
import { core, corePaths } from "../core/core-paths-fixture.ts";
import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  LINE_SAMPLE,
  SYNTHETIC_SAMPLE,
} from "../core/core-sample-fixture.ts";
import { SUB_SAMPLE } from "../core/core-sample-variant-fixture.ts";
import {
  OMS_SAMPLE_COLLECTION_CONTEXT,
  OMS_SAMPLE_CONTEXT,
} from "./oms-schema.ts";
import { toOmsSample, toOmsSampleCollection } from "./to-oms-sample.ts";

const PROJECTED_CORE_PATHS = [
  "identification.sampleIdentifier",
  "identification.landingPage",
  "identification.titles",
  "identification.localName",
  "classification.natureOfSample",
  "classification.sampleObjectTypes",
  "classification.materialCategories",
  "classification.contextCategories",
  "responsibility.agent",
  "responsibility.roles",
  "production.collection_date_start",
  "production.collection_date_end",
  "production.collectionDatePrecision",
  "production.collectionDateTimeZone",
  "production.collectionMethod",
  "production.collectionMethodDescription",
  "production.samplingPurpose",
  "production.samplingSite_name",
  "production.processSteps",
  "production.location",
  "relations.relationType",
  "relations.targetIdentifier",
  "relations.targetURI",
  "rightsAndAccess.rightsURIs",
];

const DROPPED_CORE_PATHS = [
  "schemaVersion",
  "record.recordId",
  "record.createdAt",
  "record.updatedAt",
  "record.metadataLanguage",
  "record.metadataVersion",
  "record.lifecycleEvents",
  "identification.doi",
  "publication.publisher",
  "publication.publicationYear",
  "production.projects",
  "physicalDescription.orientation",
  "physicalDescription.openPhysicalDescription",
  "physicalDescription.dimensions",
  "physicalDescription.mass",
  "physicalDescription.volume",
  "relations.targetTitles",
  "relations.targetResourceType",
  "relations.relatedMetadataScheme",
  "relations.schemeURI",
  "relations.schemeType",
  "relations.description",
  "curation.existenceStatus",
  "curation.availabilityStatus",
  "curation.currentRepository",
  "curation.originalRepository",
  "curation.sampleCondition",
  "extensions.fieldwork",
  "rightsAndAccess.metadataVisibility",
  "rightsAndAccess.sensitiveLocation",
  "manualGroups.id",
  "manualGroups.name",
  "extensions.geology",
  "extensions.safety",
  "extensions.experiment",
];

const RIGHTS_URI = "https://creativecommons.org/licenses/by/4.0/";

const PARENT_URI =
  "https://igsn.example.org/samples/0123456789ABCDEFGHJKMNPQRS";

const SECOND_PARENT_URI = "https://igsn.example.org/samples/CNRS1234567891";

const POINT = { type: "Point", coordinates: [6.18, 48.69] };

const POLYGON = {
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
};

const LINE = {
  type: "LineString",
  coordinates: [
    [-20, 30],
    [-10, 40],
  ],
};

const FIELD_FEATURE = {
  "@id": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  type: "Feature",
  featureType: "sosa:Sample",
  geometry: POINT,
  properties: {
    sampleIdentifier: "ABCDEFGHJKMNPQRSTVWXYZ0123",
    name: "Granite outcrop block",
    localName: "Block A",
    specimenType: [
      toConcept("nature-of-sample", "hand_sample"),
      toConcept("sample-type", "core.section"),
    ],
    materialCategory: toConcept("material", "rock_and_sediment.rock"),
    contextCategory: [
      toConcept(
        "material",
        "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      ),
      toConcept("texture", "phaneritic"),
      toConcept("physiographic-environment", "continental.badlands"),
      toConcept("resource-type", "mineral_and_ore.uranium"),
      toConcept("geologicalContext", "Hercynian basement"),
      toConcept("scientificContext", "field_sample", "provenance-status"),
    ],
    placeName: "Nancy quarry",
    locationDescription: "Northern face of the quarry",
    verticalExtent: {
      minimum: {
        value: 120,
        unitCode: "m",
        reference: "depthBelowGround",
        verticalDatum: "EPSG:5720",
        positiveDirection: "down",
      },
    },
    countryCode: "FR",
    navigationMethod: toConcept("navigation-type", "GPS"),
    isResultOf: {
      startTime: "2024-06-01T08:30",
      endTime: "2024-06-01T11:00",
      timePrecision: "hour",
      timeZone: "Europe/Paris",
      usedProcedure: toConcept("sample_description", "coring.box_corer"),
      procedureDescription: "Box corer on the port side",
      madeBySampler: { name: "Inge Lehmann" },
    },
    preparationStep: [],
    hasOriginalSample: [PARENT_URI],
    rightsURI: RIGHTS_URI,
  },
};

const SYNTHETIC_FEATURE = {
  "@id": "https://igsn.example.org/samples/CNRS1234567890",
  type: "Feature",
  featureType: "sosa:Sample",
  geometry: null,
  properties: {
    sampleIdentifier: "CNRS1234567890",
    name: "Synthetic basaltic glass",
    specimenType: [
      toConcept("nature-of-sample", "multiple_sample"),
      toConcept("sample-type", "individual_sample"),
    ],
    materialCategory: toConcept(
      "material",
      "rock_and_sediment.synthetic_rock_mineral",
    ),
    contextCategory: [
      toConcept("material", "rock_and_sediment.synthetic_rock_mineral"),
      toConcept("scientificContext", "field_sample", "provenance-status"),
    ],
    isResultOf: {
      startTime: "2025-01-12",
      endTime: "2025-01-12",
      timePrecision: "day",
      madeBySampler: { name: "Rosalind Franklin" },
    },
    preparationStep: [
      {
        stepType: "Synthesis",
        startTime: "2025-01-10",
        endTime: "2025-01-12",
        timePrecision: "day",
        description: "Piston cylinder run held at 2 GPa",
      },
    ],
    hasOriginalSample: [],
    rightsURI: RIGHTS_URI,
  },
};

const TWO_PARENT_SUB_SAMPLE: Sample = {
  ...SUB_SAMPLE,
  relations: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      relationType: "is_derived_from",
      identifierType: "doi",
      identifier: "https://doi.org/10.1234/lorraine-dataset",
      targetTitle: "Lorraine dataset",
      targetResourceType: "dataset",
      relatedMetadataScheme: null,
      schemeURI: null,
      schemeType: null,
      description: null,
    },
  ],
  parents: [
    ...SUB_SAMPLE.parents,
    {
      id: "99999999-7777-4777-8777-999999999999",
      igsn: "CNRS1234567891",
      name: "Second parent block",
      material: null,
    },
  ],
};

describe("a Core record mapped to an OMS feature", () => {
  it("should project a field sample onto its SOSA sample feature", () => {
    expect(toOmsSample(core(FIELD_SAMPLE))).toEqual({
      "@context": OMS_SAMPLE_CONTEXT,
      ...FIELD_FEATURE,
    });
  });

  it("should project a synthetic sample onto its SOSA sample feature", () => {
    expect(toOmsSample(core(SYNTHETIC_SAMPLE))).toEqual({
      "@context": OMS_SAMPLE_CONTEXT,
      ...SYNTHETIC_FEATURE,
    });
  });

  it.each([
    { name: "an area", sample: COLLECTION_SPECIMEN, geometry: POLYGON },
    { name: "a track", sample: LINE_SAMPLE, geometry: LINE },
  ])(
    "should carry the Core geometry of $name unchanged",
    ({ sample, geometry }) => {
      expect(toOmsSample(core(sample)).geometry).toEqual(geometry);
    },
  );

  it("should carry every parent, but no declared relation, and every process step of a sub-sample", () => {
    const { properties } = toOmsSample(core(TWO_PARENT_SUB_SAMPLE));

    expect(properties.hasOriginalSample).toEqual([
      PARENT_URI,
      SECOND_PARENT_URI,
    ]);
    expect(properties.preparationStep).toEqual([
      {
        stepType: "Subsampling",
        startTime: "2024-06-05",
        endTime: "2024-06-06",
        timePrecision: "day",
        description: "Sawn into three slabs",
      },
      { stepType: "Preparation" },
    ]);
  });
});

describe("a page of Core records mapped to an OMS feature collection", () => {
  it("should hold the total, the returned count and the features without their own context", () => {
    expect(
      toOmsSampleCollection([core(FIELD_SAMPLE), core(SYNTHETIC_SAMPLE)], 7),
    ).toEqual({
      "@context": OMS_SAMPLE_COLLECTION_CONTEXT,
      type: "FeatureCollection",
      featureType: "sosa:SampleCollection",
      numberMatched: 7,
      numberReturned: 2,
      features: [FIELD_FEATURE, SYNTHETIC_FEATURE],
    });
  });
});

describe("the Core coverage of the OMS mapping", () => {
  it("should hold every Core field as projected or deliberately dropped", () => {
    expect(corePaths().toSorted()).toEqual(
      [...PROJECTED_CORE_PATHS, ...DROPPED_CORE_PATHS].toSorted(),
    );
  });
});

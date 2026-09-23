import type { Sample } from "../sample.ts";
import type { CoreAgentRole, CoreSample } from "./core-sample-schema.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { pathSegment } from "../path/segment.ts";
import { sampleSchema } from "../sample.ts";
import {
  COLLECTION_SPECIMEN,
  FIELD_SAMPLE,
  SYNTHETIC_SAMPLE,
} from "./core-sample-fixture.ts";
import { SUB_SAMPLE } from "./core-sample-variant-fixture.ts";
import { fromCoreSample } from "./from-core-sample.ts";

export const FRONTEND_URL = "https://igsn.example.org/";

export const ORGANIZATION_NAME =
  "Centre National de la Recherche Scientifique (CNRS)";

const ORGANIZATION_URI = "https://ror.org/02feahw73";

const IGSN = "ABCDEFGHJKMNPQRSTVWXYZ0123";

const DOI_PREFIX = "10.5072";

const RELATION_ID = "99999999-9999-4999-8999-999999999999";

const PARENT_ID = "44444444-4444-4444-8444-444444444444";

const TECHNICAL = {
  id: "11111111-1111-4111-8111-111111111111",
  igsn: IGSN,
  doiPrefix: DOI_PREFIX,
  status: "published",
  createdAt: new Date("2024-06-02T10:00:00.000Z"),
  publishedAt: new Date("2024-06-03T10:00:00.000Z"),
  updatedAt: new Date("2024-06-04T10:00:00.000Z"),
  owner: { firstname: "Marie", name: "Curie" },
  institutionalOrganization: "02feahw73",
  institutionalOsu: "OMP",
  institutionalLaboratory: "UMR3589",
  publicationYear: 2024,
  attachments: [],
};

export function hydrate(body: CoreSampleBody): Sample {
  const { sample, parents } = fromCoreSample(body);
  return sampleSchema.parse({
    ...sample,
    ...TECHNICAL,
    relations: (sample.relations ?? []).map((relation) => ({
      ...relation,
      id: RELATION_ID,
    })),
    parents: parents.map(({ igsn, relationIndex }) => ({
      id: PARENT_ID,
      igsn,
      name: body.relations?.[relationIndex]?.targetTitles[0]?.value ?? "",
      material: null,
    })),
    manualGroups: body.manualGroups ?? [],
  });
}

const concept = <
  S extends string,
  I extends string,
  N extends string | undefined = undefined,
>(
  scheme: S,
  id: I,
  notation?: N,
) => ({
  id,
  label: pathSegment(id),
  schemeName: `otelo:${scheme}` as const,
  schemeURI: `urn:otelo:vocabulary:${scheme}` as const,
  notation: notation as N,
});

const ENVELOPE: Pick<
  CoreSample,
  "schemaVersion" | "record" | "publication" | "rightsAndAccess"
> = {
  schemaVersion: "0.10.0",
  record: {
    recordId: "urn:uuid:11111111-1111-4111-8111-111111111111",
    createdAt: "2024-06-02T10:00:00.000Z",
    updatedAt: "2024-06-04T10:00:00.000Z",
    metadataLanguage: ["en"],
    metadataVersion: "0.10.0",
    lifecycleEvents: [
      { eventType: "created", timestamp: "2024-06-02T10:00:00.000Z" },
      { eventType: "published", timestamp: "2024-06-03T10:00:00.000Z" },
      { eventType: "updated", timestamp: "2024-06-04T10:00:00.000Z" },
    ],
  },
  publication: {
    publisher: { id: "https://ror.org/02cyw3861", name: "OTELo" },
    publicationYear: 2024,
  },
  rightsAndAccess: {
    rightsURIs: ["https://creativecommons.org/licenses/by/4.0/"],
    metadataVisibility: "public",
    sensitiveLocation: false,
  },
};

const CREATOR: CoreAgentRole = {
  agent: {
    firstname: "Marie",
    lastname: "Curie",
    agentType: "Person",
    affiliations: [
      { id: ORGANIZATION_URI, name: ORGANIZATION_NAME },
      { id: "urn:otelo:osu:OMP", name: "Observatoire Midi-Pyrénées (OMP)" },
      {
        id: "urn:otelo:laboratory:UMR3589",
        name: "Centre National de Recherches Météorologiques (CNRM)",
      },
    ],
  },
  roles: ["Creator"],
};

const REGISTRANT: CoreAgentRole = {
  agent: {
    id: "https://ror.org/02cyw3861",
    name: "OTELo",
    agentType: "Organization",
  },
  roles: ["Registrant"],
};

export const FIELD_SAMPLE_RECORD: CoreSample = {
  ...ENVELOPE,
  identification: {
    sampleIdentifier: IGSN,
    doi: `${DOI_PREFIX}/${IGSN}`,
    landingPage: `${FRONTEND_URL}samples/${IGSN}`,
    titles: [
      { value: "Granite outcrop block", titleType: "Main" },
      { value: "NCY-2024-017", titleType: "Other" },
    ],
    localName: "Block A",
  },
  classification: {
    natureOfSample: concept("nature-of-sample", "hand_sample"),
    sampleObjectTypes: [concept("sample-type", "core.section")],
    materialCategories: [concept("material", "rock_and_sediment.rock")],
    contextCategories: [
      concept(
        "material",
        "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      ),
      concept("texture", "phaneritic"),
      concept("physiographic-environment", "continental.badlands"),
      concept("resource-type", "mineral_and_ore.uranium"),
      concept("geologicalContext", "Hercynian basement"),
      concept("scientificContext", "field_sample", "provenance-status"),
    ],
  },
  responsibility: [
    CREATOR,
    REGISTRANT,
    {
      agent: {
        id: "https://orcid.org/0000-0001-5109-3700",
        firstname: "Inge",
        lastname: "Lehmann",
        agentType: "Person",
      },
      roles: ["Collector"],
    },
    {
      agent: {
        id: "https://orcid.org/0000-0002-1825-0097",
        firstname: "Alfred",
        lastname: "Wegener",
        agentType: "Person",
      },
      roles: ["ChiefScientist"],
    },
    {
      agent: {
        id: ORGANIZATION_URI,
        name: ORGANIZATION_NAME,
        agentType: "Organization",
      },
      roles: ["HostingInstitution"],
    },
  ],
  production: {
    collection_date_start: "2024-06-01T08:30",
    collection_date_end: "2024-06-01T11:00",
    collectionDatePrecision: "hour",
    collectionDateTimeZone: "Europe/Paris",
    collectionMethod: concept("sample_description", "coring.box_corer"),
    collectionMethodDescription: "Box corer on the port side",
    samplingPurpose: "Sampling campaign of June 2024",
    samplingSite_name: "Quarry 12",
    projects: [
      {
        name: "GEOLOR",
        fundingReferences: [{ value: ORGANIZATION_URI, identifierType: "ROR" }],
        funding: "ANR grant 2023",
        description: "Mapping the Hercynian basement",
        campaign: "MEDUSA-3",
      },
    ],
    location: {
      geometry: { type: "Point", coordinates: [6.18, 48.69] },
      crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
      verticalExtent: {
        minimum: {
          value: 120,
          unitCode: "m",
          reference: "depthBelowGround",
          verticalDatum: "EPSG:5720",
          positiveDirection: "down",
        },
      },
      placeNames: ["Nancy quarry"],
      countryCodes: ["FR"],
      navigationMethod: concept("navigation-type", "GPS"),
      locationDescription: "Northern face of the quarry",
    },
  },
  physicalDescription: {
    orientation: {
      oriented: true,
      description: "North arrow painted on the top face",
    },
    openPhysicalDescription: "Coarse grained and slightly weathered",
    dimensions: {
      length: { value: 12, unitCode: "cm", unitLabel: "cm" },
      width: { value: 8, unitCode: "cm", unitLabel: "cm" },
      thickness: { value: 4, unitCode: "cm", unitLabel: "cm" },
    },
    mass: { value: 2.4, unitCode: "kg", unitLabel: "kg" },
    volume: { value: 350, unitCode: "mL", unitLabel: "ml" },
  },
  relations: [
    {
      relationType: "IsCitedBy",
      targetIdentifier: {
        value: "https://doi.org/10.1234/granites-of-lorraine",
        identifierType: "DOI",
      },
      targetURI: "https://doi.org/10.1234/granites-of-lorraine",
      targetTitles: [{ value: "Granites of Lorraine", titleType: "Main" }],
      targetResourceType: "JournalArticle",
    },
    {
      relationType: "IsDerivedFrom",
      targetIdentifier: {
        value: "0123456789ABCDEFGHJKMNPQRS",
        identifierType: "DOI",
      },
      targetURI: `${FRONTEND_URL}samples/0123456789ABCDEFGHJKMNPQRS`,
      targetTitles: [{ value: "Parent core", titleType: "Main" }],
      targetResourceType: "PhysicalObject",
    },
  ],
  curation: {
    existenceStatus: "partiallyConsumed",
    availabilityStatus: "available",
    currentRepository: {
      organization: { id: ORGANIZATION_URI, name: ORGANIZATION_NAME },
      collectionName: "Lorraine granites",
      contactFirstName: "Pierre",
      contactLastName: "Curie",
    },
    originalRepository: {
      organization: { name: "Ecole des Mines collection" },
      contactFirstName: "Henri",
      contactLastName: "Becquerel",
    },
    sampleCondition: {
      storageCondition: [
        concept("sample_condition", "temperature_controlled"),
        concept("sample_condition", "pressure_controlled"),
      ],
      temperature_type: concept("sample_condition", "refrigerated"),
      temperature: { value: 4, unitCode: "Cel", unitLabel: "celsius" },
      pressureType: concept("pressure-type", "controlled_gas"),
      pressure: { value: 1100, unitCode: "bar", unitLabel: "kbar" },
      packaging: concept("packaging", "cardboard_box"),
      description: "Kept away from vibration",
    },
  },
  manualGroups: [
    { id: "33333333-3333-4333-8333-333333333333", name: "Lorraine survey" },
  ],
  extensions: {
    geology: {
      numericAge: { min: 320, max: 340, unit: "Ma" },
      chronostratigraphy: {
        min: "ICS30",
        max: "ICS32",
        unit: "Carboniferous",
      },
      economic: {
        depositName: "Lorraine uranium deposit",
        depositDescription: "A small vein system",
        resourceTypePrecision: "Unconformity related",
        interestElements: [concept("element", "u")],
      },
    },
    safety: {
      radioactivity: { flag: true, explanation: "Natural uranium traces" },
      asbestos: { flag: false },
      chemical: { flag: false },
    },
  },
};

const COLLECTION_SPECIMEN_RECORD: CoreSample = {
  ...ENVELOPE,
  identification: {
    sampleIdentifier: IGSN,
    doi: `${DOI_PREFIX}/${IGSN}`,
    landingPage: `${FRONTEND_URL}samples/${IGSN}`,
    titles: [{ value: "Deep sea gravel", titleType: "Main" }],
  },
  classification: {
    natureOfSample: concept("nature-of-sample", "residue"),
    sampleObjectTypes: [concept("sample-type", "dredge")],
    materialCategories: [concept("material", "rock_and_sediment.sediment")],
    contextCategories: [
      concept(
        "material",
        "rock_and_sediment.sediment.exogenous_detritic.gravel.cobble",
      ),
      concept("scientificContext", "collection_specimen", "provenance-status"),
      concept("scientificContext", "purchase", "collection-origin"),
      concept(
        "scientificContext",
        "Bought from a private collection",
        "collection-context-description",
      ),
    ],
  },
  responsibility: [
    CREATOR,
    REGISTRANT,
    {
      agent: {
        firstname: "Jacques",
        lastname: "Cousteau",
        agentType: "Person",
      },
      roles: ["Collector"],
    },
    {
      agent: { firstname: "Mary", lastname: "Anning", agentType: "Person" },
      roles: ["Curator"],
    },
  ],
  production: {
    collection_date_start: "2023-03-01",
    collection_date_end: "2023-03-05",
    collectionDatePrecision: "day",
    collectionMethod: concept("sample_description", "blasting"),
    location: {
      geometry: {
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
      },
      crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
      verticalExtent: {
        minimum: {
          value: 1000,
          unitCode: "m",
          reference: "bathymetry",
          verticalDatum: "EPSG:5714",
          positiveDirection: "down",
        },
        maximum: {
          value: 2000,
          unitCode: "m",
          reference: "bathymetry",
          verticalDatum: "EPSG:5714",
          positiveDirection: "down",
        },
      },
      placeNames: ["Mid Atlantic ridge"],
      oceanOrSea: concept("ocean-sea", "north_atlantic_ocean"),
      navigationMethod: concept("navigation-type", "USBL"),
    },
  },
  physicalDescription: {
    orientation: { oriented: false },
    mass: { value: 500, unitCode: "g", unitLabel: "g" },
  },
  curation: {
    existenceStatus: "exists",
    availabilityStatus: "restricted",
  },
};

export const SYNTHETIC_SAMPLE_RECORD: CoreSample = {
  ...ENVELOPE,
  identification: {
    sampleIdentifier: IGSN,
    doi: `${DOI_PREFIX}/${IGSN}`,
    landingPage: `${FRONTEND_URL}samples/${IGSN}`,
    titles: [{ value: "Synthetic basaltic glass", titleType: "Main" }],
  },
  classification: {
    natureOfSample: concept("nature-of-sample", "multiple_sample"),
    sampleObjectTypes: [concept("sample-type", "individual_sample")],
    materialCategories: [
      concept("material", "rock_and_sediment.synthetic_rock_mineral"),
    ],
    contextCategories: [
      concept("material", "rock_and_sediment.synthetic_rock_mineral"),
      concept("scientificContext", "field_sample", "provenance-status"),
    ],
  },
  responsibility: [
    CREATOR,
    REGISTRANT,
    {
      agent: {
        firstname: "Rosalind",
        lastname: "Franklin",
        agentType: "Person",
      },
      roles: ["Collector"],
    },
  ],
  production: {
    collection_date_start: "2025-01-12",
    collection_date_end: "2025-01-12",
    collectionDatePrecision: "day",
    processSteps: [
      {
        stepType: "Synthesis",
        description: "Piston cylinder run held at 2 GPa",
        timestampStart: "2025-01-10",
        timestampEnd: "2025-01-12",
        timestampPrecision: "day",
        method: concept("experiment-type", "fusion"),
      },
    ],
  },
  curation: {
    existenceStatus: "exists",
    availabilityStatus: "available",
  },
  extensions: {
    experiment: {
      startingMaterial: "synthetic",
      startingMaterialNature: "powder",
      startingMaterialComposition: "Silica and alumina powders",
      finalProduct: "glass",
      experimentType: concept("experiment-type", "fusion"),
      duration: { value: 90, unitCode: "min", unitLabel: "minute" },
      temperature: { value: 1450, unitCode: "Cel", unitLabel: "celsius" },
      pressure: { value: 2000000000, unitCode: "Pa", unitLabel: "gpa" },
      purpose: "Calibrate the melting curve",
      equipment: "Piston cylinder press",
      operator: {
        id: "https://orcid.org/0000-0003-1415-9269",
        firstname: "Rosalind",
        lastname: "Franklin",
        affiliations: [{ id: ORGANIZATION_URI, name: ORGANIZATION_NAME }],
      },
    },
  },
};

const SUB_SAMPLE_RECORD: CoreSample = {
  ...FIELD_SAMPLE_RECORD,
  identification: {
    ...FIELD_SAMPLE_RECORD.identification,
    titles: [
      { value: "Thin section of the block", titleType: "Main" },
      { value: "NCY-2024-017", titleType: "Other" },
    ],
  },
  production: {
    ...FIELD_SAMPLE_RECORD.production,
    processSteps: [
      {
        stepType: "Subsampling",
        description: "Sawn into three slabs",
        timestampStart: "2024-06-05",
        timestampEnd: "2024-06-06",
        timestampPrecision: "day",
      },
      { stepType: "Preparation" },
    ],
  },
};

export const CORE_RECORD_FIXTURES = [
  { name: "a field sample", record: FIELD_SAMPLE_RECORD, sample: FIELD_SAMPLE },
  {
    name: "a collection specimen",
    record: COLLECTION_SPECIMEN_RECORD,
    sample: COLLECTION_SPECIMEN,
  },
  {
    name: "a synthetic sample",
    record: SYNTHETIC_SAMPLE_RECORD,
    sample: SYNTHETIC_SAMPLE,
  },
  { name: "a sub-sample", record: SUB_SAMPLE_RECORD, sample: SUB_SAMPLE },
];

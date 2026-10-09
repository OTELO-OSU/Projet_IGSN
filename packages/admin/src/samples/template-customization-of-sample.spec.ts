import type { Sample } from "@projet-igsn/domain/sample/sample";

import { expect, it } from "vitest";

import { templateCustomizationOfSample } from "./template-customization-of-sample.ts";

const GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";

const COLLECTION_DATE = {
  precision: "day" as const,
  start: "2026-01-01",
  end: "2026-01-01",
};

const RELATION = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c33b1",
  relationType: "is_cited_by" as const,
  identifierType: "doi" as const,
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: null,
  targetResourceType: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: null,
};

const EMPTY_AGE = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
};

const bare: Sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalte du Massif Central",
  localId: null,
  localIdDescription: null,
  nature: null,
  type: null,
  material: "rock_and_sediment",
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
  description: null,
  condition: null,
  repository: null,
  geologicalContextDescription: null,
  physiographicEnvironment: null,
  scientificContext: null,
  syntheticDetails: null,
  age: null,
  relations: [],
  processSteps: [],
  mineralClassifications: [],
  attachments: [],
  security: null,
  existenceStatus: null,
  availabilityStatus: null,
  publicationYear: 2026,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  doiPrefix: null,
  internalNumber: 42,
  owner: null,
  manualGroups: [],
  parents: [],
  children: [],
  series: null,
  hasSubSamples: false,
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "published",
  synchronizationStatus: null,
  synchronizationError: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
};

const NO_SECTIONS = {
  physicalDescription: false,
  age: false,
  conservationSecurity: false,
  repository: false,
  relatedDocuments: false,
  geologicalContext: false,
};

it("should prefill the root material, no group, no provenance, no sub-samples and no section from a bare sample", () => {
  expect(templateCustomizationOfSample(bare)).toEqual({
    materialPath: ["rock_and_sediment"],
    groupId: "",
    provenanceValue: "",
    subSamples: false,
    sections: NO_SECTIONS,
  });
});

it("should prefill the material cut to three levels, the first group, the provenance, sub-samples and every filled section", () => {
  expect(
    templateCustomizationOfSample({
      ...bare,
      material: "rock_and_sediment.rock.igneous.plutonic",
      manualGroups: [
        { id: GROUP_ID, name: "Basalt team" },
        { id: "3f2504e0-4f89-41d3-9a0c-0305000000a2", name: "Fossil team" },
      ],
      scientificContext: {
        provenanceStatus: "collection_specimen",
        collectionOrigin: "scientific_expedition",
      },
      parents: [
        {
          id: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
          igsn: "01K072TVWVFK5A1RRZ5MY4PPK8",
          name: "Massif Central 2026",
          material: null,
        },
      ],
      description: { mass: { value: 5, unit: "kg" } },
      age: { ...EMPTY_AGE, geologicalUnit: "Chaîne des Puys" },
      condition: { packaging: "glass_bottle" },
      repository: { collectionName: "Volcanic collection" },
      relations: [RELATION],
      geologicalContextDescription: "Volcanic plateau",
    }),
  ).toEqual({
    materialPath: [
      "rock_and_sediment",
      "rock_and_sediment.rock",
      "rock_and_sediment.rock.igneous",
    ],
    groupId: GROUP_ID,
    provenanceValue: "collection_specimen",
    subSamples: true,
    sections: {
      physicalDescription: true,
      age: true,
      conservationSecurity: true,
      repository: true,
      relatedDocuments: true,
      geologicalContext: true,
    },
  });
});

it.each<[string, Partial<Sample>, keyof typeof NO_SECTIONS]>([
  [
    "a physical measurement",
    { description: { length: { value: 3, unit: "cm" } } },
    "physicalDescription",
  ],
  ["a numeric age", { age: { ...EMPTY_AGE, numericAgeMin: 10 } }, "age"],
  [
    "a storage condition",
    { condition: { packaging: "glass_bottle" } },
    "conservationSecurity",
  ],
  [
    "a security hazard",
    { security: { radioactivity: true } },
    "conservationSecurity",
  ],
  ["an existence status alone", { existenceStatus: "exists" }, "repository"],
  [
    "an availability status alone",
    { availabilityStatus: "available" },
    "repository",
  ],
  [
    "a repository field",
    { repository: { collectionName: "Volcanic collection" } },
    "repository",
  ],
  ["a related document", { relations: [RELATION] }, "relatedDocuments"],
  [
    "a geological context description",
    { geologicalContextDescription: "Volcanic plateau" },
    "geologicalContext",
  ],
  [
    "a physiographic environment",
    { physiographicEnvironment: "continental.plateau" },
    "geologicalContext",
  ],
])("should check the section holding %s", (_, patch, section) => {
  expect(templateCustomizationOfSample({ ...bare, ...patch }).sections).toEqual(
    { ...NO_SECTIONS, [section]: true },
  );
});

it.each<[string, Partial<Sample>]>([
  [
    "a collection date alone, an identity column",
    { description: { collectionDate: COLLECTION_DATE } },
  ],
  ["an age whose every field is null", { age: EMPTY_AGE }],
  [
    "a repository with an empty rights holder list",
    { repository: { rightsHolder: [] } },
  ],
  [
    "attachments alone, outside the template",
    {
      attachments: [
        {
          id: "3f2504e0-4f89-41d3-9a0c-0305e82c33cc",
          name: "data.csv",
          mediaType: "text/csv",
          title: null,
          targetResourceType: null,
          description: null,
        },
      ],
    },
  ],
])("should check no section on %s", (_, patch) => {
  expect(templateCustomizationOfSample({ ...bare, ...patch }).sections).toEqual(
    NO_SECTIONS,
  );
});

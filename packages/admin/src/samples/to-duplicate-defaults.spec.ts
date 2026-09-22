import type { Sample } from "@projet-igsn/domain/sample/sample";

import { expect, it } from "vitest";

import { toDuplicateDefaults } from "./to-duplicate-defaults.ts";

const SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const PARENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3300";
const ATTACHABLE_GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";
const OUT_OF_REACH_GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a2";

const relation = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c33b1",
  relationType: "is_cited_by" as const,
  identifierType: "doi" as const,
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "Companion dataset",
  targetResourceType: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: null,
};

const processStep = {
  kind: "preparation" as const,
  date: { precision: "day" as const, start: "2026-02-01", end: "2026-02-01" },
  description: "Cut into thin sections",
};

const source: Sample = {
  id: SOURCE_ID,
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: "dredge",
  material: "rock_and_sediment.mineral",
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: "coring.gravity_corer",
  collectionMethodDescription: "Cored at 40 m",
  specificName: "MC-2026-007",
  location: { position: { type: "point", longitude: 3, latitude: 45 } },
  description: {
    collectionDate: {
      precision: "day",
      start: "2026-01-01",
      end: "2026-01-01",
    },
  },
  condition: null,
  repository: { currentArchive: "02feahw73" },
  geologicalContextDescription: "Volcanic plateau",
  geomorphologicalEnvironment: null,
  scientificContext: {
    provenanceStatus: "collection_specimen",
    collectionCuratorFirstname: "Georges",
    collectionCuratorLastname: "Cuvier",
    collectionOrigin: "scientific_expedition",
  },
  syntheticDetails: null,
  age: null,
  relations: [relation],
  processSteps: [processStep],
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
  security: { radioactivity: false, asbestosRich: false, chemicalRisk: false },
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: 2026,
  resourceType: "physical_object",
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  doiPrefix: "10.5072",
  owner: { name: "Curie", firstname: "Marie" },
  manualGroups: [
    { id: ATTACHABLE_GROUP_ID, name: "Basalt team" },
    { id: OUT_OF_REACH_GROUP_ID, name: "Granite team" },
  ],
  parents: [
    {
      id: PARENT_ID,
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK8",
      name: "Massif Central 2026",
      material: null,
    },
  ],
  institutionalOrganization: "02feahw73",
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "published",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
};

it("should copy every declared field under a copy name, keeping no attachment, no identity and no group out of reach", () => {
  expect(
    toDuplicateDefaults(source, [ATTACHABLE_GROUP_ID], [PARENT_ID]),
  ).toEqual({
    name: "Basalte du Massif Central (copy)",
    nature: "thin_section",
    type: "dredge",
    material: "rock_and_sediment.mineral",
    materialOtherName: null,
    texture: null,
    metamorphicFacies: null,
    metamorphicFabric: null,
    collectionMethod: "coring.gravity_corer",
    collectionMethodDescription: "Cored at 40 m",
    specificName: "MC-2026-007",
    location: { position: { type: "point", longitude: 3, latitude: 45 } },
    description: {
      collectionDate: {
        precision: "day",
        start: "2026-01-01",
        end: "2026-01-01",
      },
    },
    condition: null,
    repository: { currentArchive: "02feahw73" },
    geologicalContextDescription: "Volcanic plateau",
    geomorphologicalEnvironment: null,
    scientificContext: {
      provenanceStatus: "collection_specimen",
      collectionCuratorFirstname: "Georges",
      collectionCuratorLastname: "Cuvier",
      collectionOrigin: "scientific_expedition",
    },
    syntheticDetails: null,
    age: null,
    security: {
      radioactivity: false,
      asbestosRich: false,
      chemicalRisk: false,
    },
    existenceStatus: "exists",
    availabilityStatus: "available",
    resourceType: "physical_object",
    economicInterestElements: [],
    economicResourceTypePrecision: null,
    economicDepositName: null,
    economicDepositDescription: null,
    relations: [relation],
    processSteps: [processStep],
    attachments: [],
    manualGroupIds: [ATTACHABLE_GROUP_ID],
    parentIds: [PARENT_ID],
  });
});

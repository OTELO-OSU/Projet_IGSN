import type { Sample } from "@projet-igsn/domain/sample/sample";

import { expect, it } from "vitest";

import { toSubSampleDefaults } from "./to-sub-sample-defaults.ts";

const PARENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const GRANDPARENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3300";

const parent: Sample = {
  id: PARENT_ID,
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
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition",
  },
  syntheticDetails: null,
  age: null,
  relations: [
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c33b1",
      relationType: "is_cited_by",
      identifierType: "doi",
      identifier: "https://doi.org/10.1594/IEDA.100252",
      targetTitle: "Companion dataset",
      targetResourceType: null,
      relationTypeInformation: null,
      relatedMetadataScheme: null,
      schemeURI: null,
      schemeType: null,
      description: null,
    },
  ],
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
  owner: { name: "Curie", firstname: "Marie" },
  manualGroups: [
    { id: "3f2504e0-4f89-41d3-9a0c-0305000000a1", name: "Basalt team" },
  ],
  parents: [
    {
      id: GRANDPARENT_ID,
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

it("should inherit every block of the parent but its identity, its collections and its own parentage", () => {
  expect(toSubSampleDefaults(parent)).toEqual({
    parentIds: [PARENT_ID],
    relations: [],
    attachments: [],
    manualGroupIds: [],
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
      collectionCurator: "Georges Cuvier",
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
  });
});

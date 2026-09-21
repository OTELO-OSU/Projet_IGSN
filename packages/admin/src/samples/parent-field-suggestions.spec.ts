import type { Sample } from "@projet-igsn/domain/sample/sample";

import { expect, it } from "vitest";

import { parentFieldSuggestions } from "./parent-field-suggestions.ts";

const FIRST_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const SECOND_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3302";

const sample = (overrides: Partial<Sample>): Sample => ({
  id: FIRST_ID,
  name: "Massif Central 2026",
  nature: "thin_section",
  type: "dredge",
  material: "rock_and_sediment.mineral",
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: "coring.gravity_corer",
  collectionMethodDescription: null,
  specificName: "MC-2026-007",
  location: { position: { type: "point", longitude: 3, latitude: 45 } },
  description: { openDescription: "Fine grained", oriented: false },
  condition: null,
  repository: null,
  geologicalContextDescription: "Volcanic plateau",
  geomorphologicalEnvironment: "continental.plateau",
  scientificContext: null,
  syntheticDetails: null,
  age: null,
  relations: [],
  processSteps: [{ kind: "preparation", description: "Powdered" }],
  attachments: [],
  security: null,
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: 2026,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  doiPrefix: "10.5072",
  owner: { name: "Curie", firstname: "Marie" },
  manualGroups: [],
  parents: [],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "published",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T10:00:00.000Z"),
  ...overrides,
});

const first = sample({ name: "Parent one", existenceStatus: null });
const second = sample({
  id: SECOND_ID,
  name: "Parent two",
  collectionMethod: null,
  description: { openDescription: "Coarse grained" },
});

it("should suggest each parent's own stored value per form field, with no slot on what a sub sample must not inherit", () => {
  const { forField } = parentFieldSuggestions([first, second]);
  const names = [
    "specificName",
    "description.openDescription",
    "description.oriented",
    "description.collectionDatePrecision",
    "scientificContext.provenanceStatus",
    "security.radioactivity",
    "existenceStatus",
    "collectionMethodPath",
    "texture",
    "name",
    "nature",
    "materialPath",
    "parentIds",
    "manualGroupIds",
    "relations",
    "relations[0].targetTitle",
    "processSteps[0].description",
    "location.longitude",
    "geologicalContextDescription",
    "geomorphologicalEnvironmentPath",
  ];

  expect(
    Object.fromEntries(names.map((name) => [name, forField(name)])),
  ).toEqual({
    specificName: [
      { source: "Parent one", value: "MC-2026-007" },
      { source: "Parent two", value: "MC-2026-007" },
    ],
    "description.openDescription": [
      { source: "Parent one", value: "Fine grained" },
      { source: "Parent two", value: "Coarse grained" },
    ],
    "description.oriented": [
      { source: "Parent one", value: false },
      { source: "Parent two", value: undefined },
    ],
    "description.collectionDatePrecision": [
      { source: "Parent one", value: undefined },
      { source: "Parent two", value: undefined },
    ],
    "scientificContext.provenanceStatus": [
      { source: "Parent one", value: undefined },
      { source: "Parent two", value: undefined },
    ],
    "security.radioactivity": [
      { source: "Parent one", value: undefined },
      { source: "Parent two", value: undefined },
    ],
    existenceStatus: [
      { source: "Parent one", value: undefined },
      { source: "Parent two", value: "exists" },
    ],
    collectionMethodPath: [
      { source: "Parent one", value: ["coring", "coring.gravity_corer"] },
      { source: "Parent two", value: undefined },
    ],
    texture: [
      { source: "Parent one", value: undefined },
      { source: "Parent two", value: undefined },
    ],
    name: [],
    nature: [],
    materialPath: [],
    parentIds: [],
    manualGroupIds: [],
    relations: [],
    "relations[0].targetTitle": [],
    "processSteps[0].description": [],
    "location.longitude": [],
    geologicalContextDescription: [],
    geomorphologicalEnvironmentPath: [],
  });
});

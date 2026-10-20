import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  TEMPLATE_FIELD_KEYS,
  type TemplateFieldKey,
} from "@projet-igsn/domain/sample/import/template-fields";
import { expect, it } from "vitest";

import { templateCustomizationOfSample } from "./template-customization-of-sample.ts";

const GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";

const USER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000b1";

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

const NO_FIELDS = Object.fromEntries(
  TEMPLATE_FIELD_KEYS.map((key) => [key, false]),
) as Record<TemplateFieldKey, boolean>;

it("should prefill the root material, no group, no provenance, no sub-samples and no field from a bare sample", () => {
  expect(templateCustomizationOfSample(bare)).toEqual({
    materialPath: ["rock_and_sediment"],
    groupId: "",
    provenanceValue: "",
    subSamples: false,
    fields: NO_FIELDS,
  });
});

it("should prefill the material cut to three levels, the first group, the provenance, sub-samples and every filled field", () => {
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
    fields: {
      ...NO_FIELDS,
      manualGroup: true,
      collectionOrigin: true,
      mass: true,
      geologicalContextDescription: true,
    },
  });
});

it.each<[string, Partial<Sample>, TemplateFieldKey]>([
  [
    "a length, its width sibling left empty",
    { description: { length: { value: 3, unit: "cm" } } },
    "length",
  ],
  ["a related document", { relations: [RELATION] }, "relations"],
  [
    "an existence status alone",
    { existenceStatus: "exists" },
    "curationStatus",
  ],
  [
    "a collector linked to an account with no typed name",
    {
      scientificContext: {
        provenanceStatus: "collection_specimen",
        collectorUserId: USER_ID,
      },
    },
    "collector",
  ],
  [
    "a chief scientist linked to an account with no typed name",
    {
      scientificContext: {
        provenanceStatus: "research_project_sample",
        chiefScientistUserId: USER_ID,
        additionalRoles: [],
      },
    },
    "chiefScientist",
  ],
  [
    "a manual group",
    { manualGroups: [{ id: GROUP_ID, name: "Basalt team" }] },
    "manualGroup",
  ],
])("should check only the field holding %s", (_, patch, field) => {
  expect(templateCustomizationOfSample({ ...bare, ...patch }).fields).toEqual({
    ...NO_FIELDS,
    [field]: true,
  });
});

it.each<[string, Partial<Sample>]>([
  ["an age whose every field is null", { age: EMPTY_AGE }],
  [
    "a repository with an empty rights holder list",
    { repository: { rightsHolder: [] } },
  ],
])("should check no field on %s", (_, patch) => {
  expect(templateCustomizationOfSample({ ...bare, ...patch }).fields).toEqual(
    NO_FIELDS,
  );
});

import type { Sample } from "../sample.ts";

import { publicSampleResponseSchema } from "../sample-validator.ts";
import { toWithdrawnSample } from "./withdrawn-sample.ts";

const MEMBER = {
  id: "6b2d3c4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  igsn: "CNRS1234567892",
  name: "Rhyolite 12",
  material: "rock_and_sediment.rock.other",
};

const withdrawn: Sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Rhyolite 11",
  localId: null,
  localIdDescription: null,
  nature: "hand_sample",
  type: "dredge",
  material: "rock_and_sediment.rock.other",
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: "dredging",
  collectionMethodDescription: null,
  specificName: "Pitchstone",
  location: {
    position: { type: "point", longitude: 2.8, latitude: 45.5 },
    region: { kind: "country", country: "FR" },
    navigationType: null,
    localityName: "Mont-Dore",
    localityDescription: "kept out of the public view",
  },
  description: { openDescription: "kept out of the public view" },
  condition: null,
  repository: { currentArchiveLaboratory: "UMR3589" },
  geologicalContextDescription: "kept out of the public view",
  physiographicEnvironment: "continental.plain",
  scientificContext: {
    provenanceStatus: "research_project_sample",
    collectorFirstname: "Claire",
    collectorLastname: "Martin",
    additionalRoles: [
      {
        role: "researcher",
        personFirstname: "Kept",
        personLastname: "private",
      },
    ],
  },
  syntheticDetails: null,
  age: null,
  relations: [],
  processSteps: [],
  attachments: [],
  security: { radioactivity: true, radioactivityExplanation: "handle gloved" },
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: 2026,
  resourceType: "mineral_and_ore",
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  mineralClassifications: [],
  igsn: "CNRS1234567890",
  doiPrefix: "10.5072",
  internalNumber: 42,
  owner: { name: "Martin", firstname: "Jean" },
  manualGroups: [],
  parents: [],
  children: [],
  hasSubSamples: false,
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "withdrawn",
  synchronizationStatus: "synced",
  synchronizationError: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("toWithdrawnSample", () => {
  it.each(["withdrawn", "embargo"] as const)(
    "should keep only the whitelisted fields of a %s sample",
    (status) => {
      expect(toWithdrawnSample({ ...withdrawn, status })).toEqual({
        status,
        igsn: "CNRS1234567890",
        name: "Rhyolite 11",
        nature: "hand_sample",
        type: "dredge",
        material: "rock_and_sediment.rock.other",
        specificName: "Pitchstone",
        location: {
          region: { kind: "country", country: "FR" },
          localityName: "Mont-Dore",
        },
        collectorFirstname: "Claire",
        collectorLastname: "Martin",
        children: [],
      });
    },
  );

  it("should answer a redacted embargo sample in the public sample response", () => {
    const view = { ...toWithdrawnSample(withdrawn), status: "embargo" };
    expect(publicSampleResponseSchema.parse({ data: view })).toEqual({
      data: view,
    });
  });

  it("should keep the members of a withdrawn series of samples", () => {
    expect(
      toWithdrawnSample({
        ...withdrawn,
        type: "serie_of_sample.dredge",
        children: [MEMBER],
      }),
    ).toMatchObject({ children: [MEMBER] });
  });

  it("should report no collector nor location when the sample has none", () => {
    expect(
      toWithdrawnSample({
        ...withdrawn,
        scientificContext: null,
        location: null,
      }),
    ).toMatchObject({
      location: null,
      collectorFirstname: null,
      collectorLastname: null,
    });
  });
});

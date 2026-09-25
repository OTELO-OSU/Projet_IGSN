import type { Sample } from "../sample.ts";

import { toWithdrawnSample } from "./withdrawn-sample.ts";

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
    provenanceStatus: "field_sample",
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
  igsn: "CNRS1234567890",
  doiPrefix: "10.5072",
  internalNumber: 42,
  owner: { name: "Martin", firstname: "Jean" },
  manualGroups: [],
  parents: [],
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  status: "withdrawn",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("toWithdrawnSample", () => {
  it("should keep only the whitelisted fields of the withdrawn sample", () => {
    expect(toWithdrawnSample(withdrawn)).toEqual({
      status: "withdrawn",
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
    });
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

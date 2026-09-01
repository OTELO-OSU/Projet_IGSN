import type { Sample } from "../sample.ts";
import type { ScientificContext } from "../scientific-context/model.ts";

import { toWithdrawnSample } from "./withdrawn-sample.ts";

const withdrawn: Sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Rhyolite 11",
  nature: "hand_sample",
  type: "dredge",
  material: "sediment",
  texture: null,
  metamorphicFacies: null,
  collectionMethod: "dredging",
  collectionMethodDescription: null,
  specificName: null,
  location: {
    position: { type: "point", longitude: 2.8, latitude: 45.5 },
    region: { kind: "continent", country: "FR" },
    navigationType: null,
    localityName: "Mont-Dore",
    localityDescription: "kept out of the public view",
  },
  description: { openDescription: "kept out of the public view" },
  condition: null,
  scientificContext: {
    provenanceStatus: "recent_collection",
    collectorName: "Claire Martin",
  },
  age: null,
  links: [],
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
  owner: { name: "Martin", firstname: "Jean" },
  manualGroups: [],
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
      material: "sediment",
      location: {
        region: { kind: "continent", country: "FR" },
        localityName: "Mont-Dore",
      },
      collectorName: "Claire Martin",
      collectionCurator: null,
    });
  });

  it("should expose the curator of a historical specimen", () => {
    const scientificContext = {
      provenanceStatus: "historical_specimen",
      collectorName: "Pierre Curie",
      collectionCurator: "Paris museum",
    } satisfies ScientificContext;
    expect(
      toWithdrawnSample({ ...withdrawn, scientificContext }),
    ).toMatchObject({
      collectorName: "Pierre Curie",
      collectionCurator: "Paris museum",
    });
  });

  it("should report no collector, curator nor location when the sample has none", () => {
    expect(
      toWithdrawnSample({
        ...withdrawn,
        scientificContext: null,
        location: null,
      }),
    ).toMatchObject({
      location: null,
      collectorName: null,
      collectionCurator: null,
    });
  });
});

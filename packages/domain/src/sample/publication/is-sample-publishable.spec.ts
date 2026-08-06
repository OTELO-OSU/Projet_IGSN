import type { Sample } from "../sample.ts";

import { isSamplePublishable } from "./is-sample-publishable.ts";

const draft: Sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalt sample",
  nature: "thin_section",
  type: "individual_sample",
  material: null,
  texture: null,
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "BAS-42-001",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
  condition: null,
  scientificContext: {
    provenanceStatus: "historical_specimen",
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition",
  },
  age: null,
  links: [],
  attachments: [],
  security: null,
  availability: "exists",
  publicationYear: null,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  published: false,
  createdAt: new Date("2026-07-02T10:00:00.000Z"),
  updatedAt: new Date("2026-07-02T10:00:00.000Z"),
};

describe("isSamplePublishable", () => {
  const publishable: Sample = {
    ...draft,
    material: "rock.igneous.plutonic.felsic.granite",
  };

  it("should accept a sample nothing blocks", () => {
    expect(isSamplePublishable(publishable)).toBe(true);
  });

  it("should reject a sample raising a blocker, which sample-publish-blockers owns case by case", () => {
    expect(isSamplePublishable({ ...publishable, material: null })).toBe(false);
  });

  it("should pass the upload limit through to the blockers", () => {
    const attachments = Array(4).fill({}) as Sample["attachments"];
    expect(isSamplePublishable({ ...publishable, attachments }, 3)).toBe(false);
    expect(isSamplePublishable({ ...publishable, attachments }, 4)).toBe(true);
  });

  it("should pass the publisher through to the blockers", () => {
    expect(
      isSamplePublishable(publishable, undefined, {
        status: "pending",
        superAdmin: false,
      }),
    ).toBe(false);
    expect(
      isSamplePublishable(publishable, undefined, {
        status: "accepted",
        superAdmin: false,
      }),
    ).toBe(true);
  });
});

import type { MaterialPath } from "./material.ts";
import type { Sample } from "./sample.ts";

import { isSamplePublishable } from "./is-sample-publishable.ts";

const draft: Sample = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "Basalt sample",
  nature: "thin_section",
  type: "individual_sample",
  material: null,
  collectionMethod: null,
  specificName: "BAS-42-001",
  igsn: null,
  published: false,
  createdAt: new Date("2026-07-02T10:00:00.000Z"),
  updatedAt: new Date("2026-07-02T10:00:00.000Z"),
};

describe("isSamplePublishable", () => {
  it("should reject a sample with no material", () => {
    expect(isSamplePublishable(draft)).toBe(false);
  });

  it("should reject a sample with no type", () => {
    expect(
      isSamplePublishable({ ...draft, type: null, material: "rock.igneous" }),
    ).toBe(false);
  });

  it.each<MaterialPath>(["rock", "extraterrestrial_rock"])(
    "should reject a sample with material %s",
    (material) => {
      expect(isSamplePublishable({ ...draft, material })).toBe(false);
    },
  );

  it("should accept a sample with no specific name", () => {
    expect(
      isSamplePublishable({
        ...draft,
        material: "rock.igneous",
        specificName: null,
      }),
    ).toBe(true);
  });

  it("should accept a leaf material under an in-scope type", () => {
    expect(
      isSamplePublishable({
        ...draft,
        material: "rock.igneous",
      }),
    ).toBe(true);
  });
});

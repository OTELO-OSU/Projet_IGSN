import type { MaterialPath } from "../material/classification.ts";
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
  age: null,
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
      isSamplePublishable({
        ...draft,
        type: null,
        material: "rock.igneous.plutonic.felsic.granite",
      }),
    ).toBe(false);
  });

  it("should reject a sample whose material path is incomplete", () => {
    expect(isSamplePublishable({ ...draft, material: "rock" })).toBe(false);
  });

  it("should reject a complete-material sample with no location", () => {
    expect(
      isSamplePublishable({
        ...draft,
        material: "rock.igneous.plutonic.felsic.granite",
        location: null,
      }),
    ).toBe(false);
  });

  it.each<MaterialPath>([
    "rock.igneous.plutonic.felsic.granite",
    "extraterrestrial_rock.micrometeorites",
  ])("should accept a sample with complete material %s", (material) => {
    expect(isSamplePublishable({ ...draft, material })).toBe(true);
  });

  it("should accept a sample with no specific name", () => {
    expect(
      isSamplePublishable({
        ...draft,
        material: "rock.igneous.plutonic.felsic.granite",
        specificName: null,
      }),
    ).toBe(true);
  });

  it("should accept a leaf material under an in-scope type", () => {
    expect(
      isSamplePublishable({
        ...draft,
        material: "rock.igneous.plutonic.felsic.granite",
      }),
    ).toBe(true);
  });
});

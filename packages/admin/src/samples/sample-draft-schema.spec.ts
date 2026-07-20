import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it } from "vitest";

import { toConditionDraft } from "./compose-condition.ts";
import { toDescriptionDraft } from "./compose-description.ts";
import { toLocationDraft } from "./compose-location.ts";
import { type SampleDraft, sampleDraftSchema } from "./sample-draft-schema.ts";

const draft: SampleDraft = {
  name: "Basalt 42",
  nature: "thin_section",
  typePath: toHierarchyPath("dredge"),
  materialPath: toHierarchyPath("fossil"),
  texture: undefined,
  metamorphicFacies: undefined,
  collectionMethodPath: toHierarchyPath(null),
  collectionMethodDescription: null,
  specificName: null,
  location: toLocationDraft(null),
  description: toDescriptionDraft(null),
  condition: toConditionDraft(null),
  availability: "exists",
};

describe("sampleDraftSchema", () => {
  it("should compose the draft and validate it like the API does", () => {
    expect(sampleDraftSchema.parse(draft)).toEqual({
      name: "Basalt 42",
      nature: "thin_section",
      type: "dredge",
      material: "fossil",
      collectionMethod: null,
      collectionMethodDescription: null,
      specificName: null,
      location: null,
      availability: "exists",
    });
  });

  it("should drop a lingering location when the material forbids one", () => {
    // The location tab hides for synthetic materials, so a location entered
    // before the switch must be cleared, not block the save invisibly.
    const result = sampleDraftSchema.parse({
      ...draft,
      materialPath: toHierarchyPath("synthetic_rock_mineral"),
      location: {
        ...toLocationDraft(null),
        type: "point",
        longitude: 2.35,
        latitude: 48.85,
      },
    });

    expect(result).toMatchObject({
      material: "synthetic_rock_mineral",
      location: null,
    });
  });

  it("should drop a lingering location when the material no longer determines its requirement", () => {
    // The location section hides while the requirement is undetermined (the
    // material was cleared), so a location entered before must be cleared,
    // not block the save invisibly.
    const result = sampleDraftSchema.parse({
      ...draft,
      materialPath: [],
      location: {
        ...toLocationDraft(null),
        type: "point",
        longitude: 2.35,
        latitude: 48.85,
      },
    });

    expect(result).toMatchObject({ material: null, location: null });
  });

  it("should compose an entered description into the domain shape", () => {
    expect(
      sampleDraftSchema.parse({
        ...draft,
        description: {
          ...toDescriptionDraft(null),
          collectionDateStart: "2026-01-05",
          collectionDateEnd: "2026-01-05",
          massValue: 1.2,
          massUnit: "kg",
        },
      }),
    ).toEqual({
      name: "Basalt 42",
      nature: "thin_section",
      type: "dredge",
      material: "fossil",
      collectionMethod: null,
      collectionMethodDescription: null,
      specificName: null,
      location: null,
      availability: "exists",
      description: {
        collectionDate: { start: "2026-01-05", end: "2026-01-05" },
        mass: { value: 1.2, unit: "kg" },
      },
    });
  });

  it("should reject a value only the domain schema constrains", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      location: {
        ...toLocationDraft(null),
        type: "point",
        longitude: 200,
        latitude: 45,
      },
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "location.position.longitude",
    ]);
  });

  it("should reject a measurement value missing its unit", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      description: { ...toDescriptionDraft(null), massValue: 5 },
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "description.mass.unit",
    ]);
  });
});

import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it } from "vitest";

import { EMPTY_AGE_FORM_VALUES } from "./age-form.ts";
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
  age: EMPTY_AGE_FORM_VALUES,
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
});

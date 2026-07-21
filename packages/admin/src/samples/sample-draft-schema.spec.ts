import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it } from "vitest";

import { EMPTY_AGE_FORM_VALUES } from "./age-form.ts";
import { toConditionDraft } from "./compose-condition.ts";
import { toDescriptionDraft } from "./compose-description.ts";
import { toEconomicInterestDraft } from "./compose-economic-interest.ts";
import { toLocationDraft } from "./compose-location.ts";
import { toSecurityDraft } from "./compose-security.ts";
import {
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "./sample-draft-schema.ts";

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
  security: toSecurityDraft(null),
  availability: "exists",
  age: EMPTY_AGE_FORM_VALUES,
  links: [],
  ...toEconomicInterestDraft(undefined),
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

  it("should compose link rows, dropping blank ones", () => {
    const result = sampleDraftSchema.parse({
      ...draft,
      links: [
        {
          key: "k1",
          url: " https://doi.org/10.1594/IEDA.100252 ",
          description: "  ",
        },
        {
          key: "k2",
          url: "https://doi.org/10.5880/GFZ.2026.001",
          description: "Companion dataset",
        },
        { key: "k3", url: "", description: "" },
      ],
    });

    expect(result.links).toEqual([
      { url: "https://doi.org/10.1594/IEDA.100252", description: null },
      {
        url: "https://doi.org/10.5880/GFZ.2026.001",
        description: "Companion dataset",
      },
    ]);
  });

  it("should omit links when every row is blank", () => {
    const result = sampleDraftSchema.parse({
      ...draft,
      links: [{ key: "k1", url: "", description: "" }],
    });

    expect(result).not.toHaveProperty("links");
  });

  it("should reject a description without its url on the row's url", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      links: [
        {
          key: "k1",
          url: "https://doi.org/10.1594/IEDA.100252",
          description: "",
        },
        { key: "k2", url: "", description: "Companion dataset" },
      ],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "links.1.url",
    ]);
  });

  it("should round-trip saved links into the draft", () => {
    expect(
      toSampleDraft({
        name: "Basalt 42",
        nature: "thin_section",
        type: null,
        links: [
          { url: "https://doi.org/10.1594/IEDA.100252", description: null },
        ],
      }).links,
    ).toEqual([
      {
        key: expect.any(String),
        url: "https://doi.org/10.1594/IEDA.100252",
        description: "",
      },
    ]);
  });
});

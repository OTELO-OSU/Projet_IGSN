import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it } from "vitest";

import { EMPTY_AGE_FORM_VALUES } from "./age-form.ts";
import { toConditionDraft } from "./compose-condition.ts";
import { toDescriptionDraft } from "./compose-description.ts";
import { toEconomicInterestDraft } from "./compose-economic-interest.ts";
import { toLocationDraft } from "./compose-location.ts";
import { toRepositoryDraft } from "./compose-repository.ts";
import { toScientificContextDraft } from "./compose-scientific-context.ts";
import { toSecurityDraft } from "./compose-security.ts";
import { toSyntheticDetailsDraft } from "./compose-synthetic-details.ts";
import {
  EMPTY_RELATION_DRAFT,
  type RelationDraft,
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "./sample-draft-schema.ts";

const relationDraft: RelationDraft = {
  ...EMPTY_RELATION_DRAFT,
  key: "k0",
  relationType: "is_cited_by",
  identifierType: "doi",
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "IEDA companion dataset",
};

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
  geologicalContextDescription: null,
  geomorphologicalEnvironmentPath: [],
  location: toLocationDraft(null),
  description: toDescriptionDraft(null),
  condition: toConditionDraft(null),
  security: toSecurityDraft(null),
  scientificContext: toScientificContextDraft(null),
  repository: toRepositoryDraft(null),
  syntheticDetails: toSyntheticDetailsDraft(null),
  existenceStatus: "exists",
  availabilityStatus: "available",
  age: EMPTY_AGE_FORM_VALUES,
  relations: [],
  manualGroupIds: [],
  ...toEconomicInterestDraft(undefined),
};

const MANUAL_GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";

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
      geologicalContextDescription: null,
      geomorphologicalEnvironment: null,
      location: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      security: {
        radioactivity: false,
        asbestosRich: false,
        chemicalRisk: false,
      },
      manualGroupIds: [],
    });
  });

  it("should drop a lingering location and geological context when the material forbids a location", () => {
    const result = sampleDraftSchema.parse({
      ...draft,
      materialPath: toHierarchyPath("synthetic_rock_mineral"),
      location: {
        ...toLocationDraft(null),
        type: "point",
        longitude: 2.35,
        latitude: 48.85,
      },
      geologicalContextDescription: "Eroded plateau",
      geomorphologicalEnvironmentPath: toHierarchyPath("marine_zone.bay"),
    });

    expect(result).toMatchObject({
      material: "synthetic_rock_mineral",
      location: null,
      geologicalContextDescription: null,
      geomorphologicalEnvironment: null,
    });
  });

  it("should keep the location when no material is chosen", () => {
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

    expect(result).toMatchObject({
      material: null,
      location: {
        position: { type: "point", longitude: 2.35, latitude: 48.85 },
      },
    });
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
      geologicalContextDescription: null,
      geomorphologicalEnvironment: null,
      location: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      security: {
        radioactivity: false,
        asbestosRich: false,
        chemicalRisk: false,
      },
      manualGroupIds: [],
      description: {
        collectionDate: {
          precision: "day",
          start: "2026-01-05",
          end: "2026-01-05",
        },
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

  it("should compose relation rows", () => {
    const result = sampleDraftSchema.parse({
      ...draft,
      relations: [
        {
          ...relationDraft,
          key: "k1",
          identifier: " https://doi.org/10.1594/IEDA.100252 ",
        },
        {
          ...relationDraft,
          key: "k2",
          identifier: "https://doi.org/10.5880/GFZ.2026.001",
          targetTitle: "Companion dataset",
          targetResourceType: "dataset",
          relationTypeInformation: "Table 2",
          description: "Cites this sample",
        },
      ],
    });

    expect(result.relations).toEqual([
      {
        relationType: "is_cited_by",
        identifierType: "doi",
        identifier: "https://doi.org/10.1594/IEDA.100252",
        targetTitle: "IEDA companion dataset",
        targetResourceType: null,
        relationTypeInformation: null,
        description: null,
      },
      {
        relationType: "is_cited_by",
        identifierType: "doi",
        identifier: "https://doi.org/10.5880/GFZ.2026.001",
        targetTitle: "Companion dataset",
        targetResourceType: "dataset",
        relationTypeInformation: "Table 2",
        description: "Cites this sample",
      },
    ]);
  });

  it("should flag every required field of a blank relation row", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      relations: [{ ...EMPTY_RELATION_DRAFT, key: "k1" }],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "relations.0.relationType",
      "relations.0.identifierType",
      "relations.0.identifier",
      "relations.0.targetTitle",
    ]);
  });

  it("should flag a row whose title is blank", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      relations: [{ ...relationDraft, targetTitle: "  " }],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "relations.0.targetTitle",
    ]);
  });

  it("should keep the scheme fields only when the relation has metadata", () => {
    const scheme = {
      relatedMetadataScheme: "DataCite",
      schemeURI: "https://schema.datacite.org",
      schemeType: "XSD",
    };

    expect(
      sampleDraftSchema.parse({
        ...draft,
        relations: [
          { ...relationDraft, relationType: "has_metadata", ...scheme },
        ],
      }).relations,
    ).toEqual([expect.objectContaining(scheme)]);

    expect(
      sampleDraftSchema.parse({
        ...draft,
        relations: [{ ...relationDraft, ...scheme }],
      }).relations,
    ).toEqual([
      expect.not.objectContaining({ relatedMetadataScheme: "DataCite" }),
    ]);
  });

  it("should flag the row that is missing a required value", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      relations: [
        relationDraft,
        {
          ...EMPTY_RELATION_DRAFT,
          key: "k2",
          targetTitle: "Companion dataset",
        },
      ],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "relations.1.relationType",
      "relations.1.identifierType",
      "relations.1.identifier",
    ]);
  });

  it("should round-trip saved relations into the draft", () => {
    expect(
      toSampleDraft({
        name: "Basalt 42",
        nature: "thin_section",
        type: null,
        relations: [
          {
            relationType: "is_cited_by",
            identifierType: "doi",
            identifier: "https://doi.org/10.1594/IEDA.100252",
            targetTitle: "IEDA companion dataset",
            targetResourceType: null,
            relationTypeInformation: null,
            relatedMetadataScheme: null,
            schemeURI: null,
            schemeType: null,
            description: null,
          },
        ],
      }).relations,
    ).toEqual([
      {
        ...relationDraft,
        key: expect.any(String),
        identifier: "https://doi.org/10.1594/IEDA.100252",
      },
    ]);
  });

  it("should round-trip the manual group ids through the draft", () => {
    expect(
      sampleDraftSchema.parse({
        ...draft,
        manualGroupIds: [MANUAL_GROUP_ID],
      }),
    ).toMatchObject({ manualGroupIds: [MANUAL_GROUP_ID] });
    expect(
      toSampleDraft({
        name: "Basalt 42",
        nature: "thin_section",
        type: null,
        manualGroupIds: [MANUAL_GROUP_ID],
      }).manualGroupIds,
    ).toEqual([MANUAL_GROUP_ID]);
  });
});

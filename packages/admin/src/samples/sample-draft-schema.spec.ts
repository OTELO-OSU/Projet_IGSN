import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
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
import { sampleDraftFieldErrors } from "./sample-draft-field-errors.ts";
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
  localId: null,
  localIdDescription: null,
  nature: "thin_section",
  typePath: toHierarchyPath("dredge"),
  materialPath: toHierarchyPath("rock_and_sediment.mineral"),
  texture: undefined,
  metamorphicFacies: undefined,
  metamorphicFabric: undefined,
  collectionMethodPath: toHierarchyPath(null),
  collectionMethodDescription: null,
  specificName: null,
  geologicalContextDescription: null,
  physiographicEnvironmentPath: [],
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
  processSteps: [],
  mineralClassifications: [],
  manualGroupIds: [],
  parentIds: [],
  ...toEconomicInterestDraft(undefined),
};

const MANUAL_GROUP_ID = "3f2504e0-4f89-41d3-9a0c-0305000000a1";

describe("sampleDraftSchema", () => {
  it("should compose the draft and validate it like the API does", () => {
    expect(sampleDraftSchema.parse(draft)).toEqual({
      name: "Basalt 42",
      localId: null,
      nature: "thin_section",
      type: "dredge",
      material: "rock_and_sediment.mineral",
      collectionMethod: null,
      collectionMethodDescription: null,
      specificName: null,
      geologicalContextDescription: null,
      physiographicEnvironment: null,
      location: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      description: { oriented: false },
      security: {
        radioactivity: false,
        asbestosRich: false,
        chemicalRisk: false,
      },
      scientificContext: {
        provenanceStatus: "field_sample",
        additionalRoles: [],
      },
      manualGroupIds: [],
    });
  });

  it.each<[string, string[], string | null]>([
    [
      "drop the specific name for the unknown rock",
      toHierarchyPath("rock_and_sediment.rock.unknown"),
      null,
    ],
    [
      "keep the trimmed specific name for any other material",
      toHierarchyPath("rock_and_sediment.mineral"),
      "MC-2026-007",
    ],
  ])("should %s", (_case, materialPath, specificName) => {
    expect(
      sampleDraftSchema.parse({
        ...draft,
        materialPath,
        specificName: "  MC-2026-007  ",
      }),
    ).toMatchObject({ specificName });
  });

  it.each<[string, string, string | undefined]>([
    [
      "drop a lingering local id description when the local id is blank",
      "  ",
      undefined,
    ],
    [
      "keep the local id description once the local id is filled",
      "  MC-2026-007  ",
      "Collection catalogue number",
    ],
  ])("should %s", (_case, localId, localIdDescription) => {
    const result = sampleDraftSchema.parse({
      ...draft,
      localId,
      localIdDescription: "  Collection catalogue number  ",
    });

    expect(result.localIdDescription).toBe(localIdDescription);
  });

  it("should drop a lingering location and geological context when the material forbids a location", () => {
    const result = sampleDraftSchema.parse({
      ...draft,
      materialPath: toHierarchyPath("rock_and_sediment.synthetic_rock_mineral"),
      location: {
        ...toLocationDraft(null),
        type: "point",
        longitude: 2.35,
        latitude: 48.85,
      },
      geologicalContextDescription: "Eroded plateau",
      physiographicEnvironmentPath: toHierarchyPath("marine.bay"),
    });

    expect(result).toMatchObject({
      material: "rock_and_sediment.synthetic_rock_mineral",
      location: null,
      geologicalContextDescription: null,
      physiographicEnvironment: null,
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
      localId: null,
      nature: "thin_section",
      type: "dredge",
      material: "rock_and_sediment.mineral",
      collectionMethod: null,
      collectionMethodDescription: null,
      specificName: null,
      geologicalContextDescription: null,
      physiographicEnvironment: null,
      location: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      security: {
        radioactivity: false,
        asbestosRich: false,
        chemicalRisk: false,
      },
      scientificContext: {
        provenanceStatus: "field_sample",
        additionalRoles: [],
      },
      manualGroupIds: [],
      description: {
        oriented: false,
        collectionDate: {
          precision: "day",
          start: "2026-01-05",
          end: "2026-01-05",
        },
        mass: { value: 1.2, unit: "kg" },
      },
    });
  });

  it("should round-trip an hour-precision synthesis date through the draft", () => {
    const synthesisDate = {
      precision: "hour",
      start: "2026-01-05T08:30",
      end: "2026-01-06T17:00",
      timeZone: "Europe/Paris",
    } as const;

    expect(
      sampleDraftSchema.parse({
        ...draft,
        materialPath: toHierarchyPath(
          "rock_and_sediment.synthetic_rock_mineral",
        ),
        syntheticDetails: toSyntheticDetailsDraft({
          synthesisDate,
          researchStructure: [],
        }),
      }),
    ).toMatchObject({ syntheticDetails: { synthesisDate } });
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
        description: null,
      },
      {
        relationType: "is_cited_by",
        identifierType: "doi",
        identifier: "https://doi.org/10.5880/GFZ.2026.001",
        targetTitle: "Companion dataset",
        targetResourceType: "dataset",
        description: "Cites this sample",
      },
    ]);
  });

  it("should flag every required field of a blank relation row", () => {
    const result = sampleDraftSchema.safeParse({
      ...draft,
      relations: [
        { ...EMPTY_RELATION_DRAFT, key: "k1", identifierType: "doi" },
      ],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "relations.0.relationType",
      "relations.0.identifier",
    ]);
  });

  it("should compose a blank relation title as no title", () => {
    expect(
      sampleDraftSchema.parse({
        ...draft,
        relations: [{ ...relationDraft, targetTitle: "  " }],
      }).relations,
    ).toEqual([expect.objectContaining({ targetTitle: null })]);
  });

  it("should open a saved relation with no title on an empty title", () => {
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
            targetTitle: null,
            targetResourceType: null,
            relatedMetadataScheme: null,
            schemeURI: null,
            schemeType: null,
            description: null,
          },
        ],
      }).relations,
    ).toEqual([expect.objectContaining({ targetTitle: "" })]);
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
          identifierType: "doi",
          targetTitle: "Companion dataset",
        },
      ],
    });

    if (result.success) throw new Error("expected the parse to fail");
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "relations.1.relationType",
      "relations.1.identifier",
    ]);
  });

  it("should open a sample with no material on the material root", () => {
    expect(toSampleDraft().materialPath).toEqual(["rock_and_sediment"]);
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

  const mineralClassifications = [
    { strunzId: "9", mindatId: null, abundance: undefined },
    { strunzId: "4.F-G", mindatId: null, abundance: "minor" },
    { strunzId: "9.E", mindatId: 2815, abundance: "major" },
  ] as const;

  it("should round-trip category, sub-category and mineral classification rows through the draft", () => {
    const loaded = toSampleDraft({
      name: "Basalt 42",
      nature: "thin_section",
      type: null,
      material: "rock_and_sediment.mineral",
      mineralClassifications: [...mineralClassifications],
    });

    expect(sampleDraftSchema.parse(loaded)).toMatchObject({
      mineralClassifications,
    });
  });

  it.each([
    {
      paths: [null],
      field: "mineralClassifications[0].path",
      message: "Required.",
    },
    {
      paths: ["9", null],
      field: "mineralClassifications[1].path",
      message: "Required.",
    },
    {
      paths: ["4", "9", "9"],
      field: "mineralClassifications[2].path",
      message: "Invalid value.",
    },
  ])(
    "should show a classification row's error on its own classification field: $paths",
    ({ paths, field, message }) => {
      const result = sampleDraftSchema.safeParse({
        ...draft,
        mineralClassifications: paths.map((path, index) => ({
          key: `k${index}`,
          path: toHierarchyPath(path),
          abundance: undefined,
        })),
      });

      if (result.success) throw new Error("expected the parse to fail");
      expect(sampleDraftFieldErrors(result.error.issues)).toEqual({
        [field]: { message },
      });
    },
  );

  it("should drop the classifications a non-mineral material hides", () => {
    expect(
      sampleDraftSchema.parse({
        ...draft,
        materialPath: toHierarchyPath("rock_and_sediment.rock"),
        mineralClassifications: [
          { key: "k0", path: toHierarchyPath("9"), abundance: undefined },
        ],
      }),
    ).not.toHaveProperty("mineralClassifications");
  });
});

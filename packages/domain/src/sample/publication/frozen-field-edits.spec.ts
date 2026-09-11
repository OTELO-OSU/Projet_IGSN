import { describe, expect, it } from "vitest";

import {
  type CreateSample,
  createSampleSchema,
  type Sample,
  sampleSchema,
} from "../sample.ts";
import { frozenFieldEdits } from "./frozen-field-edits.ts";

const EMPTY_SAMPLE_FIELDS = {
  nature: null,
  type: null,
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
  description: null,
  condition: null,
  security: null,
  existenceStatus: null,
  availabilityStatus: null,
  publicationYear: null,
  resourceType: null,
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
};

const stored: Sample = sampleSchema.parse({
  ...EMPTY_SAMPLE_FIELDS,
  id: "11111111-1111-4111-8111-111111111111",
  name: "Stored name",
  material: "rock.igneous.plutonic",
  scientificContext: {
    provenanceStatus: "field_sample",
    collectorName: "Stored collector",
  },
  manualGroups: [
    { id: "22222222-2222-4222-8222-222222222222", name: "Stored group" },
  ],
  igsn: "CNRS0000000001",
  status: "published",
  createdAt: new Date("2020-01-01"),
  updatedAt: new Date("2020-01-01"),
});

const syntheticStored: Sample = sampleSchema.parse({
  ...stored,
  material: "synthetic_rock_mineral",
  scientificContext: null,
  syntheticDetails: { operatorName: "Stored operator" },
});

const emptyStored: Sample = sampleSchema.parse({
  ...stored,
  manualGroups: [],
  scientificContext: { provenanceStatus: "field_sample", collectorName: null },
});

function body(
  sample: Sample,
  overrides: Partial<CreateSample> = {},
): CreateSample {
  return createSampleSchema.parse({
    ...Object.fromEntries(
      Object.keys(createSampleSchema.shape).map((field) => [
        field,
        sample[field as keyof Sample],
      ]),
    ),
    manualGroupIds: sample.manualGroups.map(({ id }) => id),
    parentIds: [],
    ...overrides,
  });
}

const frozenCases: {
  field: string;
  current: Sample;
  overrides: Partial<CreateSample>;
  expected: string[];
}[] = [
  {
    field: "collector name",
    current: stored,
    overrides: {
      scientificContext: {
        provenanceStatus: "field_sample",
        collectorName: "Edited collector",
      },
    },
    expected: ["scientificContext.collectorName"],
  },
  {
    field: "manual groups",
    current: stored,
    overrides: { manualGroupIds: ["33333333-3333-4333-8333-333333333333"] },
    expected: ["manualGroupIds[0]"],
  },
  {
    field: "material outside the frozen prefix",
    current: stored,
    overrides: { material: "sediment" },
    expected: ["material"],
  },
  {
    field: "operator name",
    current: syntheticStored,
    overrides: { syntheticDetails: { operatorName: "Edited operator" } },
    expected: ["syntheticDetails.operatorName"],
  },
];

describe("frozenFieldEdits", () => {
  it.each(frozenCases)(
    "should report the $field a body tries to change",
    ({ current, overrides, expected }) => {
      // Arrange / Act
      const result = frozenFieldEdits(current, body(current, overrides));
      // Assert
      expect(result).toEqual(expected);
    },
  );

  it.each([
    { case: "a new name", overrides: { name: "Edited name" } },
    {
      case: "a material deepened under the frozen prefix",
      overrides: { material: "rock.igneous.plutonic.felsic.granite" },
    },
  ])(
    "should report nothing for a body changing only $case",
    ({ overrides }) => {
      // Arrange / Act
      const result = frozenFieldEdits(stored, body(stored, overrides));
      // Assert
      expect(result).toEqual([]);
    },
  );

  it("should report nothing for a frozen field omitted while the stored one is empty", () => {
    // Arrange
    const payload = body(emptyStored, {
      manualGroupIds: undefined,
      scientificContext: { provenanceStatus: "field_sample" },
    });
    // Act
    const result = frozenFieldEdits(emptyStored, payload);
    // Assert
    expect(result).toEqual([]);
  });
});

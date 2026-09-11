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

describe("frozenFieldEdits", () => {
  it("should report a frozen field a body tries to change", () => {
    // Arrange
    const payload = body(stored, {
      scientificContext: {
        provenanceStatus: "field_sample",
        collectorName: "Edited collector",
      },
    });
    // Act
    const result = frozenFieldEdits(stored, payload);
    // Assert
    expect(result).toEqual(["scientificContext.collectorName"]);
  });

  it("should report nothing for a body changing only an editable field", () => {
    // Arrange
    const payload = body(stored, { name: "Edited name" });
    // Act
    const result = frozenFieldEdits(stored, payload);
    // Assert
    expect(result).toEqual([]);
  });

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

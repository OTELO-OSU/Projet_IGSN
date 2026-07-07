import { SAMPLE_TYPES, sampleTypeSchema } from "./type";

describe("sampleTypeSchema", () => {
  it.each(SAMPLE_TYPES)("should accept %s", (type) => {
    // Act / Assert
    expect(sampleTypeSchema.safeParse(type).success).toBe(true);
  });

  it("should accept a partial classification (ancestor path)", () => {
    // Act / Assert
    expect(sampleTypeSchema.safeParse("core").success).toBe(true);
  });

  it.each([
    "",
    "half_round", // sub-value without its parent
    "dredge.half_round", // sub-value under the wrong parent
    "core.unknown",
    "Core",
  ])("should reject %s", (input) => {
    // Act / Assert
    expect(sampleTypeSchema.safeParse(input).success).toBe(false);
  });
});

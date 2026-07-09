import {
  COLLECTION_METHODS,
  collectionMethodSchema,
} from "./collection-method";

describe("collectionMethodSchema", () => {
  it.each(COLLECTION_METHODS)("should accept %s", (method) => {
    // Act / Assert
    expect(collectionMethodSchema.safeParse(method).success).toBe(true);
  });

  it("should accept a partial classification (ancestor path)", () => {
    // Act / Assert
    expect(collectionMethodSchema.safeParse("coring").success).toBe(true);
    expect(
      collectionMethodSchema.safeParse("coring.gravity_corer").success,
    ).toBe(true);
  });

  it.each([
    "",
    "gravity_corer", // sub-value without its parent
    "dredging.gravity_corer", // sub-value under the wrong parent
    "coring.unknown",
    "Coring",
  ])("should reject %s", (input) => {
    // Act / Assert
    expect(collectionMethodSchema.safeParse(input).success).toBe(false);
  });
});

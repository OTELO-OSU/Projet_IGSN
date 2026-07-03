import { generateIgsnSuffix } from "./generate-igsn-suffix.ts";

describe("generateIgsnSuffix", () => {
  it.each([
    ["01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69", "01K072TVWVFK5A1RRZ5MY4PPK9"],
    ["00000000-0000-0000-0000-000000000000", "00000000000000000000000000"],
  ])("should derive %s into the Crockford base32 suffix %s", (id, expected) => {
    // Arrange / Act
    const suffix = generateIgsnSuffix(id);
    // Assert
    expect(suffix).toBe(expected);
  });

  it("should match the Crockford base32 alphabet", () => {
    // Arrange / Act
    const suffix = generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69");
    // Assert
    expect(suffix).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
  });

  it("should throw on a malformed sample id", () => {
    // Arrange / Act / Assert
    expect(() => generateIgsnSuffix("pas-un-uuid")).toThrow();
  });
});

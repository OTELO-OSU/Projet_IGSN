import { generateIgsnSuffix } from "./generate-igsn-suffix.ts";
import { igsnSchema, igsnSuffixSchema } from "./model.ts";

describe("igsnSuffixSchema", () => {
  it.each([
    "01K072TVWVFK5A1RRZ5MY4PPK9",
    "01k072tvwvfk5a1rrz5my4ppk9",
    "  01K072TVWVFK5A1RRZ5MY4PPK9  ",
  ])("should accept the valid suffix %s", (input) => {
    // Arrange / Act
    const result = igsnSuffixSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    "",
    "01K072TVWVFK5A1RRZ5MY4PPK",
    "01K072TVWVFK5A1RRZ5MY4PPK99",
    "01L072TVWVFK5A1RRZ5MY4PPK9",
    "01K072TVWVFK-A1RRZ5MY4PPK9",
  ])("should reject the invalid suffix %s", (input) => {
    // Arrange / Act
    const result = igsnSuffixSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });

  it("should normalize a parsed suffix to uppercase", () => {
    // Arrange / Act
    const result = igsnSuffixSchema.parse("  01k072tvwvfk5a1rrz5my4ppk9  ");
    // Assert
    expect(result).toBe("01K072TVWVFK5A1RRZ5MY4PPK9");
  });

  it("should accept a suffix produced by generateIgsnSuffix", () => {
    // Arrange
    const suffix = generateIgsnSuffix("01980e2d-6f9b-7cca-a0e3-1f2d3c4b5a69");
    // Act
    const result = igsnSuffixSchema.safeParse(suffix);
    // Assert
    expect(result.success).toBe(true);
  });
});

describe("igsnSchema", () => {
  it.each([
    "01K072TVWVFK5A1RRZ5MY4PPK9",
    "CNRS0000012260",
    "TOAE0000000002",
    "  CNRS0000012260  ",
    "cnrs0000012260",
  ])("should accept the stored IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    "",
    "abc",
    "CNRS-000012260",
    "CNRS 0000012260",
    "CNRS000001226",
    "ABCD0000000001",
  ])("should reject the invalid IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });

  it("should normalize a legacy IGSN to uppercase", () => {
    // Arrange / Act
    const result = igsnSchema.parse("  cnrs0000012260  ");
    // Assert
    expect(result).toBe("CNRS0000012260");
  });
});

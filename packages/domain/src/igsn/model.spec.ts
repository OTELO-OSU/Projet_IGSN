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
    "01K072TVWVFK5A1RRZ5MY4PPK", // 25 chars
    "01K072TVWVFK5A1RRZ5MY4PPK99", // 27 chars
    "01L072TVWVFK5A1RRZ5MY4PPK9", // L excluded from Crockford base32
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
    "10.60510/01K072TVWVFK5A1RRZ5MY4PPK9",
    "10.123456789/01K072TVWVFK5A1RRZ5MY4PPK9",
    "  10.60510/01k072tvwvfk5a1rrz5my4ppk9  ",
  ])("should accept the valid IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    "",
    "01K072TVWVFK5A1RRZ5MY4PPK9",
    "10./01K072TVWVFK5A1RRZ5MY4PPK9",
    "10.60510",
    "10.60510/",
    "11.60510/01K072TVWVFK5A1RRZ5MY4PPK9",
    "10.60510/IGSN123",
    "10.60510/01L072TVWVFK5A1RRZ5MY4PPK9",
  ])("should reject the invalid IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });

  it("should normalize a parsed IGSN to canonical uppercase", () => {
    // Arrange / Act
    const result = igsnSchema.parse("  10.60510/01k072tvwvfk5a1rrz5my4ppk9  ");
    // Assert
    expect(result).toBe("10.60510/01K072TVWVFK5A1RRZ5MY4PPK9");
  });
});

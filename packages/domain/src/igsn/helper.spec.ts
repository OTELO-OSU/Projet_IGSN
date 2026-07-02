import { generateIgsnSuffix, normalizeIgsn } from "./helper";

describe("normalizeIgsn", () => {
  it.each([
    ["  10.60510/igsn123  ", "10.60510/IGSN123"],
    ["10.58052/iecur0097", "10.58052/IECUR0097"],
  ])("should normalize %s to %s", (input, expected) => {
    // Arrange / Act
    const result = normalizeIgsn(input);
    // Assert
    expect(result).toBe(expected);
  });
});

describe("generateIgsnSuffix", () => {
  it("should generate a 12-character Crockford base32 suffix", () => {
    // Arrange / Act
    const suffix = generateIgsnSuffix();
    // Assert
    expect(suffix).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{12}$/);
  });

  it("should generate distinct suffixes", () => {
    // Arrange / Act
    const suffixes = new Set(
      Array.from({ length: 1000 }, () => generateIgsnSuffix()),
    );
    // Assert
    expect(suffixes.size).toBe(1000);
  });
});

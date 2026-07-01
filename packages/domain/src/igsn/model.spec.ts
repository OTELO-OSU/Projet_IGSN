import { igsnSchema } from "./model";

describe("igsnSchema", () => {
  it.each([
    "10.60510/IGSN123",
    "10.58052/IECUR0097",
    "10.1234/abc-._;()/:XYZ",
    "  10.60510/igsn123  ",
  ])("should accept the valid IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    "",
    "IGSN123",
    "10./abc",
    "10.60510",
    "11.60510/abc",
    "10.60510/",
    "10.60510/ab cd",
  ])("should reject the invalid IGSN %s", (input) => {
    // Arrange / Act
    const result = igsnSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });

  it("should normalize a parsed IGSN to canonical uppercase", () => {
    // Arrange / Act
    const result = igsnSchema.parse("  10.60510/igsn123  ");
    // Assert
    expect(result).toBe("10.60510/IGSN123");
  });
});

import { orcidSchema } from "./orcid.ts";

describe("orcidSchema", () => {
  it.each([
    "0000-0002-1825-0097",
    "0000-0001-5109-370X",
    "  0000-0002-1825-0097  ",
  ])("should accept the valid ORCID %s", (input) => {
    // Arrange / Act
    const result = orcidSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it("should trim the value", () => {
    // Arrange / Act
    const result = orcidSchema.parse("  0000-0002-1825-0097  ");
    // Assert
    expect(result).toBe("0000-0002-1825-0097");
  });

  it.each([
    "",
    "not-an-orcid",
    "0000-0002-1825", // too short
    "0000-0002-1825-00971", // too long
    "0000000218250097", // missing dashes
    "0000-0002-1825-009x", // checksum letter must be uppercase
  ])("should reject the invalid ORCID %s", (input) => {
    // Arrange / Act
    const result = orcidSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});

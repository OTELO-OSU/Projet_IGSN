import { orcidSchema } from "./orcid.ts";

describe("orcidSchema", () => {
  it.each([
    "0000-0002-1825-0097",
    "0000-0001-5109-370X",
    "0000-0001-5109-370x",
    "  0000-0002-1825-0097  ",
  ])("should accept the valid ORCID %s", (input) => {
    // Arrange / Act
    const result = orcidSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ["  0000-0002-1825-0097  ", "0000-0002-1825-0097"],
    ["0000-0001-5109-370x", "0000-0001-5109-370X"],
  ])("should normalize %s to %s", (input, expected) => {
    // Arrange / Act
    const result = orcidSchema.parse(input);
    // Assert
    expect(result).toBe(expected);
  });

  it.each([
    "",
    "not-an-orcid",
    "0000-0002-1825",
    "0000-0002-1825-00971",
    "0000000218250097",
    "0000-0002-1825-00X7",
  ])("should reject the invalid ORCID %s", (input) => {
    // Arrange / Act
    const result = orcidSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(false);
  });
});

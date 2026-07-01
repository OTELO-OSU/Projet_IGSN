import { normalizeIgsn } from "./helper";

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

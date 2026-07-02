import { NATURES, natureSchema } from "./nature";

describe("natureSchema", () => {
  it.each(NATURES)("should accept the valid nature %s", (input) => {
    // Arrange / Act
    const result = natureSchema.safeParse(input);
    // Assert
    expect(result.success).toBe(true);
  });

  it.each(["", "Roche", "Thin section", "thinsection", "Unknown"])(
    "should reject the invalid nature %s",
    (input) => {
      // Arrange / Act
      const result = natureSchema.safeParse(input);
      // Assert
      expect(result.success).toBe(false);
    },
  );
});

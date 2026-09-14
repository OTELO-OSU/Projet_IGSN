import { createServiceSampleSchema } from "./service-sample-validator";

describe("createServiceSampleSchema", () => {
  it("should accept two parents on a synthetic material", () => {
    // Arrange / Act
    const result = createServiceSampleSchema.safeParse({
      name: "Synthetic blend of two parents",
      material: "rock_and_sediment.synthetic_rock_mineral",
      parentIds: ["IEFRA0001", "IEFRA0002"],
    });
    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject two parents on a material that is not synthetic", () => {
    // Arrange / Act
    const result = createServiceSampleSchema.safeParse({
      name: "Blend of two parents",
      material: "rock_and_sediment.rock",
      parentIds: ["IEFRA0001", "IEFRA0002"],
    });
    // Assert
    expect(result.error?.issues).toMatchObject([{ path: ["material"] }]);
  });
});

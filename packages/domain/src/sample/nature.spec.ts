import { natureSchema } from "./nature";

describe("natureSchema", () => {
  it("should accept a known nature", () => {
    expect(natureSchema.parse("thin_section")).toBe("thin_section");
  });

  it("should reject an unknown nature", () => {
    expect(natureSchema.safeParse("Thin section").success).toBe(false);
  });
});

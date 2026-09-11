import { describe, expect, it } from "vitest";

import { updateServiceSampleSchema } from "./service-sample-validator.ts";

describe("updateServiceSampleSchema", () => {
  it("should reject a body carrying attachments", () => {
    // Arrange / Act
    const result = updateServiceSampleSchema.safeParse({
      name: "Basalt",
      attachments: [],
    });
    // Assert
    expect(result.error?.issues.map(({ path }) => path.join("."))).toEqual([
      "attachments",
    ]);
  });

  it("should accept the same body without attachments", () => {
    // Arrange / Act
    const result = updateServiceSampleSchema.safeParse({ name: "Basalt" });
    // Assert
    expect(result.success).toBe(true);
  });
});

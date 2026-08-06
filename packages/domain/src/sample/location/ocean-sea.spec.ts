import { describe, expect, it } from "vitest";

import { oceanSeaSchema } from "./ocean-sea.ts";

describe("oceanSeaSchema", () => {
  it("should accept a known ocean/sea", () => {
    expect(oceanSeaSchema.parse("atlantic_ocean")).toBe("atlantic_ocean");
  });

  it("should reject an unknown ocean/sea", () => {
    expect(oceanSeaSchema.safeParse("atlantic").success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { manualGroupNameBodySchema } from "./manual-group-validator.ts";

describe("manualGroupNameBodySchema", () => {
  it("should trim the name", () => {
    expect(
      manualGroupNameBodySchema.parse({ name: "  Volcano project  " }),
    ).toEqual({ name: "Volcano project" });
  });

  it.each([
    ["a whitespace-only name", "   "],
    ["a name over 120 characters", "a".repeat(121)],
  ])("should refuse %s", (_case, name) => {
    expect(manualGroupNameBodySchema.safeParse({ name }).success).toBe(false);
  });
});

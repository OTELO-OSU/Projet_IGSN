import { describe, expect, it } from "vitest";

import { mineralClassificationSchema } from "./model.ts";

describe("mineralClassificationSchema", () => {
  it.each([
    { strunzId: "9" },
    { strunzId: "9.E", abundance: "major" },
    { strunzId: "9", mindatId: 975, abundance: null },
  ])("should accept the row %o", (row) => {
    expect(mineralClassificationSchema.safeParse(row).success).toBe(true);
  });

  it.each([
    [
      "a mineral under a category it does not sit directly under",
      { strunzId: "9", mindatId: 2815 },
    ],
    ["an unknown mindat id", { strunzId: "9.E", mindatId: 999999999 }],
    ["an unknown abundance", { strunzId: "9.E", abundance: "dominant" }],
  ])("should reject %s", (_rule, row) => {
    expect(mineralClassificationSchema.safeParse(row).success).toBe(false);
  });
});

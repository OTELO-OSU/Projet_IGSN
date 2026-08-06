import { describe, expect, it } from "vitest";

import { verticalDatumSchema } from "./vertical-datum.ts";

describe("verticalDatumSchema", () => {
  it("should accept a known datum", () => {
    expect(verticalDatumSchema.parse("msl")).toBe("msl");
  });

  it("should reject an unknown datum", () => {
    expect(verticalDatumSchema.safeParse("egm96").success).toBe(false);
  });
});

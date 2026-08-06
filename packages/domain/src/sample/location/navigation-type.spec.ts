import { describe, expect, it } from "vitest";

import { navigationTypeSchema } from "./navigation-type.ts";

describe("navigationTypeSchema", () => {
  it("should accept a known navigation type verbatim, slashes and colons included", () => {
    expect(navigationTypeSchema.parse("DVL/LBL:Renav:Confirmed")).toBe(
      "DVL/LBL:Renav:Confirmed",
    );
  });

  it("should reject GPS/Assumed, which the vocabulary spells GPS:Assumed", () => {
    expect(navigationTypeSchema.safeParse("GPS/Assumed").success).toBe(false);
  });
});

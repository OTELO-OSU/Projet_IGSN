import { describe, expect, it } from "vitest";

import { canEditFrozenSampleFields } from "./can-edit-frozen-sample-fields.ts";

describe("canEditFrozenSampleFields", () => {
  it("should allow a super admin", () => {
    expect(canEditFrozenSampleFields({ superAdmin: true })).toBe(true);
  });

  it("should refuse a regular user", () => {
    expect(canEditFrozenSampleFields({ superAdmin: false })).toBe(false);
  });
});

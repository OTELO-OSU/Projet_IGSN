import { describe, expect, it } from "vitest";

import { canPublishSamples } from "./can-publish-samples.ts";

describe("canPublishSamples", () => {
  it("should allow an accepted user", () => {
    expect(canPublishSamples({ status: "accepted", superAdmin: false })).toBe(
      true,
    );
  });

  it("should refuse a pending or rejected user", () => {
    expect(canPublishSamples({ status: "pending", superAdmin: false })).toBe(
      false,
    );
    expect(canPublishSamples({ status: "rejected", superAdmin: false })).toBe(
      false,
    );
  });

  it("should allow a super admin whatever their status", () => {
    expect(canPublishSamples({ status: "pending", superAdmin: true })).toBe(
      true,
    );
    expect(canPublishSamples({ status: "rejected", superAdmin: true })).toBe(
      true,
    );
  });
});
